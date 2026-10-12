import { config } from "@/lib/config";

export const runtime = "nodejs";

/** Public liveness endpoint. It intentionally returns no user or child data. */
export async function GET(): Promise<Response> {
  return Response.json(
    { status: "ok", mode: config.dataMode },
    { headers: { "Cache-Control": "no-store" } },
  );
}
