import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { addMessage, getChildMessages } from "@/lib/data";
import { messageCreateSchema } from "@/lib/validation";
import { config } from "@/lib/config";
import { createDatabaseMessage, listDatabaseMessages } from "@/lib/postgres-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "messages:read");
    const childId = new URL(request.url).searchParams.get("childId");
    if (!childId) return jsonResponse([]);
    const messages = config.dataMode === "postgres" ? await listDatabaseMessages(session, childId) : getChildMessages(session, childId);
    return jsonResponse(messages);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "messages:create");
    const input = messageCreateSchema.parse(await readJson(request));
    const message = config.dataMode === "postgres" ? await createDatabaseMessage(session, input) : addMessage(session, input);
    return jsonResponse(message, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
