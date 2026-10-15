import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";
import { monthlyObservationCounts } from "@/lib/analytics-math";
import { forecastDashboardSchema } from "@/lib/forecast-contract";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  if (config.dataMode !== "sqlite") throw new Error("Run this integration test with DATA_MODE=sqlite.");
  const baseUrl = process.env.TEST_FORECAST_API_BASE_URL;
  const userId = process.env.TEST_FORECAST_ADMIN_USER_ID;
  if (!baseUrl || !userId) throw new Error("Set TEST_FORECAST_API_BASE_URL and TEST_FORECAST_ADMIN_USER_ID for a real integration run.");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  assert(user && ["CENTER_ADMIN", "DISTRICT_ADMIN"].includes(user.role), "TEST_FORECAST_ADMIN_USER_ID must identify an active database admin.");
  assert(user.active, "Integration test admin account must be active.");
  const signKey = new TextEncoder().encode(config.authSecret);
  const userCenterIds = Array.isArray(user.centerIds) ? user.centerIds.map(String) : [];
  const token = await new SignJWT({ name: user.name, email: user.email, role: user.role, preferredLanguage: user.preferredLanguage, centerIds: userCenterIds })
    .setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt().setExpirationTime("5m").sign(signKey);
  const endpoint = `${baseUrl.replace(/\/$/, "")}/api/v1/analytics/forecast`;
  const request = (method: string, authenticated = true) => fetch(endpoint, { method, headers: authenticated ? { cookie: `${config.sessionCookie}=${token}` } : {} });

  const unauthorized = await request("GET", false);
  assert(unauthorized.status === 401, `Unauthenticated GET returned ${unauthorized.status}, expected 401.`);
  const worker = await prisma.user.findFirst({ where: { role: "WORKER", active: true } });
  if (worker) {
    const workerToken = await new SignJWT({ name: worker.name, email: worker.email, role: worker.role, preferredLanguage: worker.preferredLanguage, centerIds: Array.isArray(worker.centerIds) ? worker.centerIds.map(String) : [] }).setProtectedHeader({ alg: "HS256" }).setSubject(worker.id).setIssuedAt().setExpirationTime("5m").sign(signKey);
    const denied = await fetch(endpoint, { headers: { cookie: `${config.sessionCookie}=${workerToken}` } });
    assert(denied.status === 403, `Worker forecast GET returned ${denied.status}, expected 403.`);
  }

  const dateRows = await prisma.observation.findMany({ where: { child: { active: true, ...(user.role === "DISTRICT_ADMIN" ? {} : { centerId: { in: userCenterIds } }) } }, select: { observedAt: true }, orderBy: { observedAt: "asc" } });
  const before = await request("GET");
  assert(before.ok, `Authenticated forecast GET returned ${before.status}.`);
  const beforeBody = await before.json();
  const parsed = forecastDashboardSchema.safeParse(beforeBody.data);
  assert(parsed.success, "Forecast GET response did not match its runtime schema.");
  assert(JSON.stringify(beforeBody.data).toLowerCase().indexOf("fullname") === -1, "Aggregate response must not expose child names.");
  assert(JSON.stringify(beforeBody.data).toLowerCase().indexOf("childid") === -1, "Aggregate response must not expose child IDs.");
  assert(JSON.stringify(parsed.data.history) === JSON.stringify(monthlyObservationCounts(dateRows.map(({ observedAt }) => observedAt))), "API history did not match the scoped SQLite monthly aggregate.");
  for (const forecast of parsed.data.forecasts) {
    const stored = await prisma.mLPrediction.findUnique({ where: { id: forecast.id }, select: { scopeCenterIds: true } });
    assert(stored && (Array.isArray(stored.scopeCenterIds) ? stored.scopeCenterIds.map(String) : []).every((id) => user.role === "DISTRICT_ADMIN" || userCenterIds.includes(id)), "Forecast crossed the admin center scope.");
  }

  const priorCount = await prisma.mLPrediction.count({ where: { predictionType: "aggregate_monthly_observation_volume" } });
  const generated = await request("POST");
  const generatedBody = await generated.json();
  if (generated.status === 201) {
    assert(generatedBody.data.childId === null, "Aggregate forecast record unexpectedly has a child ID.");
    assert(generatedBody.data.predictionValue.data_source === "sqlite_aggregate_export", "API accepted an artifact without verified SQLite provenance.");
    assert(generatedBody.data.predictionValue.model_version && generatedBody.data.predictionValue.input_data_cutoff, "Forecast omitted model version or input cutoff.");
    const after = await request("GET");
    const afterBody = await after.json();
    assert(afterBody.data.forecasts.some((row: { id: string }) => row.id === generatedBody.data.id), "POST prediction was not persisted and returned by GET.");
    console.log(JSON.stringify({ status: "PASS", history_months: parsed.data.historyMonths, forecast_id: generatedBody.data.id, model_version: generatedBody.data.modelVersion, input_data_cutoff: generatedBody.data.predictionValue.input_data_cutoff, persistence: "verified" }));
  } else {
    const code = generatedBody.error?.code;
    assert(["MODEL_NOT_CONFIGURED", "MODEL_ARTIFACT_MISSING", "MODEL_EVALUATION_INVALID", "INSUFFICIENT_HISTORY"].includes(code), `POST failed unexpectedly with ${generated.status} ${code}.`);
    const nowCount = await prisma.mLPrediction.count({ where: { predictionType: "aggregate_monthly_observation_volume" } });
    assert(nowCount === priorCount, "Failed forecast request persisted a prediction.");
    console.log(JSON.stringify({ status: "PASS", history_months: parsed.data.historyMonths, post_result: code, persistence_on_failure: "none" }));
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Integration test failed."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
