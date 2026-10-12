import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { addMessage, getChildMessages } from "@/lib/data";
import { messageCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "messages:read");
    const childId = new URL(request.url).searchParams.get("childId");
    if (!childId) return jsonResponse([]);
    const messages = getChildMessages(session, childId);
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
    const message = addMessage(session, input);
    return jsonResponse(message, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
