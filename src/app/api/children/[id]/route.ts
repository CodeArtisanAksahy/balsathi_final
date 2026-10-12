import { errorResponse, jsonResponse } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { getChildProfile } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "children:read");
    const { id } = await params;
    const profile = getChildProfile(session, id);
    return jsonResponse(profile);
  } catch (error) {
    return errorResponse(error);
  }
}
