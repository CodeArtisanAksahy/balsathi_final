import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { config } from "@/lib/config";
import { forecastDashboardSchema } from "@/lib/forecast-contract";
import { prisma } from "@/lib/prisma";

function requireTestDatabase() {
  if (config.dataMode !== "sqlite") throw new Error("Run with DATA_MODE=sqlite.");
  if (process.env.ALLOW_SQLITE_INTEGRATION_FIXTURES !== "true") throw new Error("Set ALLOW_SQLITE_INTEGRATION_FIXTURES=true to authorize temporary isolated test fixtures.");
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to run temporary integration fixtures in production.");
  const databaseName = config.databaseUrl ? new URL(config.databaseUrl).pathname.replace(/^\//, "") : "";
  if (!/(^|[-_])test($|[-_])|^test\.db$/i.test(databaseName)) throw new Error("DATABASE_URL must target a dedicated SQLite test.db file.");
}

async function main() {
  requireTestDatabase();
  if (process.env.TEST_API_BASE_URL && process.env.TEST_FORECAST_ADMIN_USER_ID) {
    await runReadOnlyIntegration(process.env.TEST_API_BASE_URL, process.env.TEST_FORECAST_ADMIN_USER_ID);
    return;
  }
  const [centerCount, userCount, childCount, observationCount] = await Promise.all([
    prisma.center.count(), prisma.user.count(), prisma.child.count(), prisma.observation.count(),
  ]);
  assert.equal(centerCount + userCount + childCount + observationCount, 0, "Refusing to add fixtures to a non-empty database.");

  const suffix = randomUUID();
  const centerId = `it-center-${suffix}`;
  const otherCenterId = `it-other-center-${suffix}`;
  const workerId = `it-worker-${suffix}`;
  const adminId = `it-admin-${suffix}`;
  const parentId = `it-parent-${suffix}`;
  const otherAdminId = `it-other-admin-${suffix}`;
  const childId = `it-child-${suffix}`;
  const otherChildId = `it-other-child-${suffix}`;
  const guardianId = `it-guardian-${suffix}`;
  const milestoneId = `it-milestone-${suffix}`;
  const email = `it-${suffix}@example.invalid`;
  const passwordHash = await bcrypt.hash("Temporary-Integration-Password-1", 4);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.center.createMany({ data: [
        { id: centerId, code: `IT-${suffix}`, name: "Integration Test Center", village: "Test", district: "Test", state: "Test" },
        { id: otherCenterId, code: `ITO-${suffix}`, name: "Integration Other Center", village: "Test", district: "Test", state: "Test" },
      ] });
      await tx.user.createMany({ data: [
        { id: workerId, name: "Integration Worker", email: `worker-${email}`, role: "WORKER", phone: "0000000000", centerIds: [centerId], passwordHash },
        { id: adminId, name: "Integration Admin", email: `admin-${email}`, role: "CENTER_ADMIN", phone: "0000000001", centerIds: [centerId], passwordHash },
        { id: parentId, name: "Integration Parent", email: `parent-${email}`, role: "PARENT", phone: "0000000002", centerIds: [], passwordHash },
        { id: otherAdminId, name: "Other Integration Admin", email: `other-${email}`, role: "CENTER_ADMIN", phone: "0000000003", centerIds: [otherCenterId], passwordHash },
      ] });
      await tx.guardian.create({ data: { id: guardianId, name: "Test Guardian", phone: "0000000004", address: "Test", linkedUserId: parentId } });
      await tx.child.createMany({ data: [
        { id: childId, internalId: `IT-${suffix}`, fullName: "Integration Child", dateOfBirth: new Date("2022-01-01T00:00:00Z"), centerId, assignedWorkerId: workerId, emergencyContactName: "Test", emergencyContactPhone: "0000000005", siblingIds: [] },
        { id: otherChildId, internalId: `ITO-${suffix}`, fullName: "Other Integration Child", dateOfBirth: new Date("2022-01-01T00:00:00Z"), centerId: otherCenterId, assignedWorkerId: otherAdminId, emergencyContactName: "Test", emergencyContactPhone: "0000000006", siblingIds: [] },
      ] });
      await tx.childGuardian.create({ data: { childId, guardianId, relationship: "MOTHER", isPrimary: true } });
      await tx.milestoneDefinition.create({ data: {
        id: milestoneId, slug: `it-${suffix}`, domain: "LANGUAGE", titleEn: "Test", titleHi: "Test", titleMr: "Test",
        descriptionEn: "Test", descriptionHi: "Test", descriptionMr: "Test", minAgeMonths: 0, maxAgeMonths: 120, reviewAfterMonths: 12,
        activitiesEn: [], activitiesHi: [], activitiesMr: [],
      } });
    });

    const baseUrl = process.env.TEST_API_BASE_URL;
    assert.ok(baseUrl, "Set TEST_API_BASE_URL to the running local app.");
    const sign = async (id: string, role: string, centers: string[]) => new SignJWT({ role, centerIds: centers, name: "Integration", email })
      .setProtectedHeader({ alg: "HS256" }).setSubject(id).setIssuedAt().setExpirationTime("5m").sign(new TextEncoder().encode(config.authSecret));
    const client = async (id: string, role: string, centers: string[]) => {
      const token = await sign(id, role, centers);
      return async (path: string, init: RequestInit = {}) => fetch(`${baseUrl!.replace(/\/$/, "")}${path}`, {
        ...init,
      headers: { cookie: `${config.sessionCookie}=${token}`, origin: baseUrl!, ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers },
      });
    };

    const loginEmail = `worker-${email}`;
    await prisma.user.update({ where: { id: workerId }, data: { email: loginEmail } });
    const loginResponse = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/login`, { method: "POST", headers: { origin: baseUrl, "content-type": "application/json" }, body: JSON.stringify({ email: loginEmail, password: "Temporary-Integration-Password-1" }) });
    assert.equal(loginResponse.status, 200, `SQLite login failed: ${loginResponse.status}`);
    const loginCookie = loginResponse.headers.get("set-cookie")?.split(";")[0];
    assert.ok(loginCookie, "SQLite login did not issue a session cookie.");
    const activeSession = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/session`, { headers: { cookie: loginCookie } });
    assert.equal(activeSession.status, 200);
    const expiredAt = Math.floor(Date.now() / 1000) - 1;
    const expiredToken = await new SignJWT({ role: "WORKER", centerIds: [centerId] }).setProtectedHeader({ alg: "HS256" }).setSubject(workerId).setIssuedAt(expiredAt - 60).setExpirationTime(expiredAt).sign(new TextEncoder().encode(config.authSecret));
    const expiredSession = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/session`, { headers: { cookie: `${config.sessionCookie}=${expiredToken}` } });
    assert.equal((await expiredSession.json()).data, null, "Expired session was accepted.");
    const changedRole = await prisma.user.update({ where: { id: workerId }, data: { role: "PARENT" } });
    try {
      const roleAfterUpdate = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/children`, { headers: { cookie: loginCookie } });
      assert.equal(roleAfterUpdate.status, 200);
      assert.deepEqual((await roleAfterUpdate.json()).data.items, [], "Database role change did not remove worker center scope for the existing session.");
    } finally {
      await prisma.user.update({ where: { id: changedRole.id }, data: { role: "WORKER" } });
    }
    await prisma.user.update({ where: { id: adminId }, data: { centerIds: [] } });
    const adminToken = await sign(adminId, "CENTER_ADMIN", [centerId]);
    const changedScope = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/children`, { headers: { cookie: `${config.sessionCookie}=${adminToken}` } });
    assert.deepEqual((await changedScope.json()).data.items, [], "Database center-scope change did not apply to the existing session.");
    await prisma.user.update({ where: { id: adminId }, data: { centerIds: [centerId] } });
    const disabledLogin = await prisma.user.update({ where: { id: workerId }, data: { active: false } });
    try {
      const disabledSession = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/session`, { headers: { cookie: loginCookie } });
      assert.equal((await disabledSession.json()).data, null, "Disabled account session was not rejected.");
    } finally {
      await prisma.user.update({ where: { id: disabledLogin.id }, data: { active: true } });
    }
    const logout = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/logout`, { method: "POST", headers: { origin: baseUrl, cookie: loginCookie } });
    assert.equal(logout.status, 200, "Logout failed.");
    assert.match(logout.headers.get("set-cookie") ?? "", /Max-Age=0/i, "Logout did not expire the session cookie.");
    const unauthorized = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/children`);
    assert.equal(unauthorized.status, 401, "Unauthenticated request was not rejected.");

    const adminRequest = await client(adminId, "CENTER_ADMIN", [centerId]);
    const workerRequest = await client(workerId, "WORKER", [centerId]);
    const parentRequest = await client(parentId, "PARENT", []);
    const otherAdminRequest = await client(otherAdminId, "CENTER_ADMIN", [otherCenterId]);

    const scoped = await adminRequest("/api/v1/children");
    assert.equal(scoped.status, 200);
    assert.deepEqual((await scoped.json()).data.items.map((item: { id: string }) => item.id), [childId]);
    assert.equal((await adminRequest(`/api/v1/children/${otherChildId}`)).status, 404, "Center admin crossed center boundary.");
    assert.equal((await parentRequest(`/api/v1/children/${otherChildId}`)).status, 404, "Parent accessed an unlinked child.");
    assert.equal((await workerRequest(`/api/v1/children/${otherChildId}`)).status, 404, "Worker crossed center boundary.");
    assert.equal((await otherAdminRequest(`/api/v1/children/${childId}`)).status, 404, "Other center admin crossed center boundary.");

    const createPath = `/api/v1/children/${childId}/observations`;
    const idempotencyKey = `it-${suffix}`;
    const observationBody = { observedAt: new Date(Date.now() - 60_000).toISOString(), method: "TEXT", observationLanguage: "en", domain: "LANGUAGE", activityContext: "Integration test", observationText: "Temporary integration observation.", workerNotes: "", followUpRequired: true, reviewStatus: "REVIEW_PENDING", attachmentIds: [], milestoneAssessments: [{ milestoneId, status: "MET", notes: "Test" }] };
    const crossOriginMutation = await workerRequest(createPath, { method: "POST", headers: { origin: "https://attacker.invalid" }, body: JSON.stringify(observationBody) });
    assert.equal(crossOriginMutation.status, 403, "Cross-origin mutation was not rejected.");
    const created = await workerRequest(createPath, { method: "POST", headers: { "idempotency-key": idempotencyKey }, body: JSON.stringify(observationBody) });
    assert.equal(created.status, 201, `Observation create failed: ${created.status} ${JSON.stringify(await created.clone().json())}`);
    const createdBody = await created.json();
    const retry = await workerRequest(createPath, { method: "POST", headers: { "idempotency-key": idempotencyKey }, body: JSON.stringify(observationBody) });
    assert.equal(retry.status, 201);
    assert.equal((await retry.json()).data.id, createdBody.data.id, "Idempotent retry did not return the original record.");
    assert.equal(await prisma.observation.count({ where: { childId } }), 1, "Duplicate retry created a second observation.");
    const readBack = await workerRequest(`/api/v1/children/${childId}`);
    assert.equal(readBack.status, 200, "Persisted child profile could not be read back.");
    assert.equal((await readBack.json()).data.observations[0].id, createdBody.data.id);
    const bootstrap = await adminRequest("/api/bootstrap");
    const snapshot = (await bootstrap.json()).data.state;
    assert.ok(snapshot.riskAssessments.some((risk: { childId: string; reviewRequired: boolean }) => risk.childId === childId && risk.reviewRequired), "Persisted follow-up was missing from the authorized dashboard bootstrap.");
    const dashboard = await adminRequest("/api/dashboard");
    const dashboardData = (await dashboard.json()).data;
    assert.equal(dashboardData.totalChildren, 1);
    assert.equal(dashboardData.followUpChildren, 1);
    assert.equal(dashboardData.observationsThisWeek, 1);
    assert.equal(dashboardData.pendingReview, 1);
    const stale = await workerRequest(`/api/v1/children/${childId}/observations`, { method: "PATCH", headers: { "if-match": "2000-01-01T00:00:00.000Z" }, body: JSON.stringify({ observationId: createdBody.data.id, observationText: "Updated integration observation" }) });
    assert.equal(stale.status, 412, "Stale observation update did not report a version conflict.");
    const invalid = await workerRequest(`/api/v1/children/${childId}/observations`, { method: "POST", body: JSON.stringify({ ...observationBody, observedAt: "not-a-date" }) });
    assert.equal(invalid.status, 400, "Invalid observation input was accepted.");

    const ready = await fetch(`${baseUrl.replace(/\/$/, "")}/api/health/ready`);
    assert.equal(ready.status, 200, "Readiness endpoint did not report available SQLite.");
    const forecast = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/analytics/forecast`, { method: "POST", headers: { origin: baseUrl, cookie: `${config.sessionCookie}=${await sign(adminId, "CENTER_ADMIN", [centerId])}` } });
    assert.equal(forecast.status, 503, "Forecast should fail without a real evaluated artifact.");
    const forecastError = await forecast.json();
    assert.ok(["MODEL_NOT_CONFIGURED", "MODEL_ARTIFACT_MISSING", "MODEL_EVALUATION_INVALID", "INSUFFICIENT_HISTORY"].includes(forecastError.error?.code), `Unexpected forecast failure: ${forecastError.error?.code}`);

    console.log(JSON.stringify({ status: "PASS", database: new URL(config.databaseUrl).pathname.slice(1), migrations: "current", sqlite_login: "verified", expired_session: "rejected", logout: "verified", role_and_center_scope_refresh: "verified", disabled_account: "rejected", same_origin: "verified", center_isolation: "verified", parent_link_scope: "verified", observation_create_and_readback: "verified", idempotent_retry: "verified", stale_update_conflict: "verified", invalid_input: "rejected", readiness: "ready", forecast_rejection: forecastError.error.code, temporary_records_cleaned: "after assertions" }));
  } finally {
    await prisma.$transaction(async (tx) => {
      await tx.auditLog.deleteMany({ where: { entityId: { contains: suffix } } });
      await tx.mLPrediction.deleteMany({ where: { modelName: "integration_test" } });
      await tx.observation.deleteMany({ where: { childId: { in: [childId, otherChildId] } } });
      await tx.milestoneAssessment.deleteMany({ where: { childId: { in: [childId, otherChildId] } } });
      await tx.childGuardian.deleteMany({ where: { childId: { in: [childId, otherChildId] } } });
      await tx.child.deleteMany({ where: { id: { in: [childId, otherChildId] } } });
      await tx.guardian.deleteMany({ where: { id: guardianId } });
      await tx.milestoneDefinition.deleteMany({ where: { id: milestoneId } });
      await tx.user.deleteMany({ where: { id: { in: [workerId, adminId, parentId, otherAdminId] } } });
      await tx.center.deleteMany({ where: { id: { in: [centerId, otherCenterId] } } });
    });
    const [centers, users, children, observations] = await Promise.all([
      prisma.center.count({ where: { id: { in: [centerId, otherCenterId] } } }),
      prisma.user.count({ where: { id: { in: [workerId, adminId, parentId, otherAdminId] } } }),
      prisma.child.count({ where: { id: { in: [childId, otherChildId] } } }),
      prisma.observation.count({ where: { childId: { in: [childId, otherChildId] } } }),
    ]);
    assert.deepEqual({ centers, users, children, observations }, { centers: 0, users: 0, children: 0, observations: 0 }, "Temporary integration fixtures were not fully cleaned up.");
  }
}

async function runReadOnlyIntegration(baseUrl: string, adminId: string) {
  const user = await prisma.user.findUnique({ where: { id: adminId } });
  assert.ok(user && user.active && ["CENTER_ADMIN", "DISTRICT_ADMIN"].includes(user.role), "TEST_FORECAST_ADMIN_USER_ID must identify an active database administrator.");
  const token = await new SignJWT({ role: user.role, centerIds: user.centerIds, name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt().setExpirationTime("5m").sign(new TextEncoder().encode(config.authSecret));
  const endpoint = baseUrl.replace(/\/$/, "");
  const cookie = `${config.sessionCookie}=${token}`;
  const ready = await fetch(`${endpoint}/api/health/ready`);
  assert.equal(ready.status, 200, "SQLite readiness check failed.");
  const unauthorized = await fetch(`${endpoint}/api/v1/analytics/forecast`);
  assert.equal(unauthorized.status, 401, "Forecast endpoint accepted an unauthenticated request.");
  const historyResponse = await fetch(`${endpoint}/api/v1/analytics/forecast`, { headers: { cookie } });
  assert.equal(historyResponse.status, 200, `Forecast history GET failed: ${historyResponse.status}`);
  const history = await historyResponse.json();
  assert.equal(forecastDashboardSchema.safeParse(history.data).success, true, "Forecast response schema was invalid.");
  const leaked = JSON.stringify(history.data).toLowerCase();
  assert.ok(!leaked.includes("fullname") && !leaked.includes("childid"), "Aggregate response contained identifiable child fields.");
  const before = await prisma.mLPrediction.count({ where: { predictionType: "aggregate_monthly_observation_volume" } });
  const generated = await fetch(`${endpoint}/api/v1/analytics/forecast`, { method: "POST", headers: { cookie } });
  if (generated.status === 201) {
    const record = await generated.json();
    assert.equal(record.data.childId, null, "Aggregate forecast unexpectedly references a child.");
    const fetched = await fetch(`${endpoint}/api/v1/analytics/forecast`, { headers: { cookie } });
    const current = await fetched.json();
    assert.ok(current.data.forecasts.some((row: { id: string }) => row.id === record.data.id), "New prediction was not returned by the forecast GET.");
    console.log(JSON.stringify({ status: "PASS", mode: "read-only-existing-db", history_months: history.data.historyMonths, forecast_generation: "real artifact invoked and prediction persisted" }));
    return;
  }
  const error = await generated.json();
  assert.ok(["MODEL_NOT_CONFIGURED", "MODEL_ARTIFACT_MISSING", "MODEL_EVALUATION_INVALID", "INSUFFICIENT_HISTORY"].includes(error.error?.code), `Unexpected forecast failure: ${error.error?.code}`);
  assert.equal(await prisma.mLPrediction.count({ where: { predictionType: "aggregate_monthly_observation_volume" } }), before, "Rejected forecast wrote a prediction.");
  console.log(JSON.stringify({ status: "PASS", mode: "read-only-existing-db", history_months: history.data.historyMonths, forecast_generation: error.error.code, persistence_on_failure: "none" }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "SQLite integration test failed.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
