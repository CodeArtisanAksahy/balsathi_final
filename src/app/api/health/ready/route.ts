import { config } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { getForecastModelReadiness } from "@/lib/database-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dependency readiness. Public response contains only dependency state, never configuration values. */
export async function GET(): Promise<Response> {
  let database: "ready" | "not_configured" | "unavailable" = "not_configured";
  if (config.dataMode === "sqlite") {
    if (config.databaseUrl) {
      try {
        let timer: ReturnType<typeof setTimeout> | undefined;
        await Promise.race([
          prisma.$queryRaw`SELECT 1`,
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), 2_000); }),
        ]);
        if (timer) clearTimeout(timer);
        database = "ready";
      } catch {
        database = "unavailable";
      }
    }
  } else {
    database = "ready";
  }

  const model = await getForecastModelReadiness();
  const ready = database === "ready";
  return Response.json({ status: ready ? "ready" : "not_ready", dependencies: { database, forecastModel: model } }, {
    status: ready ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
