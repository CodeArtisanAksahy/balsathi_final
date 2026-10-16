import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { requireDatabaseMode } from "@/lib/database-service";
import { updateProvisionedUser, updateUserSchema } from "@/lib/provisioning-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireDatabaseMode();
    const actor = await getActorFromSession();
    requirePermission(actor.role, "accounts:manage");
    const input = updateUserSchema.parse(await readJson(request));
    const { id } = await params;
    return jsonResponse(await updateProvisionedUser(actor, id, input));
  } catch (error) { return errorResponse(error); }
}
