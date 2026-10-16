import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { requireDatabaseMode } from "@/lib/database-service";
import { updateCenterSchema, updateProvisionedCenter } from "@/lib/provisioning-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireDatabaseMode();
    const actor = await getActorFromSession();
    requirePermission(actor.role, "admin:write");
    const { id } = await params;
    return jsonResponse(await updateProvisionedCenter(actor, id, updateCenterSchema.parse(await readJson(request))));
  } catch (error) { return errorResponse(error); }
}
