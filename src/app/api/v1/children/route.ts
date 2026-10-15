import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { childCreateSchema } from "@/lib/validation";
import { createDatabaseChild, listDatabaseChildren, requireDatabaseMode } from "@/lib/database-service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({ q: z.string().trim().max(120).optional(), centerId: z.string().optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20), sort: z.enum(["name", "recent", "age"]).default("name") });

export async function GET(request: Request) {
  try {
    requireDatabaseMode();
    const session = await getActorFromSession();
    requirePermission(session.role, "children:read");
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return jsonResponse(await listDatabaseChildren(session, query));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    requireDatabaseMode();
    const session = await getActorFromSession();
    requirePermission(session.role, "children:create");
    const input = childCreateSchema.parse(await readJson(request));
    const saved = await createDatabaseChild(session, input, request.headers.get("idempotency-key"));
    return jsonResponse(saved, 201);
  } catch (error) { return errorResponse(error); }
}
