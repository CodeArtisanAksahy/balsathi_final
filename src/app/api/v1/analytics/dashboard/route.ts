import { errorResponse, jsonResponse } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { databaseAnalytics, requirePostgresMode } from "@/lib/postgres-service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const querySchema = z.object({ from: z.iso.datetime().optional(), to: z.iso.datetime().optional() });

export async function GET(request: Request) {
  try {
    requirePostgresMode();
    const session = await getActorFromSession();
    requirePermission(session.role, "children:read");
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if (from && to && from > to) return Response.json({ error: { code: "INVALID_DATE_RANGE", message: "from must be before or equal to to." } }, { status: 400 });
    return jsonResponse(await databaseAnalytics(session, from, to));
  } catch (error) { return errorResponse(error); }
}
