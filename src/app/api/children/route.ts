import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getActorFromSession, requireCenterAccess, requirePermission } from "@/lib/authorization";
import { addChild, getChildProfile, getChildrenDirectory } from "@/lib/data";
import { childCreateSchema, childQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "children:read");
    const { searchParams } = new URL(request.url);
    const query = childQuerySchema.parse(Object.fromEntries(searchParams));
    const result = getChildrenDirectory(session, query);
    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "children:create");
    const input = childCreateSchema.parse(await readJson(request));
    requireCenterAccess(session, input.centerId);
    const child = addChild(session, input);
    const profile = getChildProfile(session, child.id);
    return jsonResponse(profile, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
