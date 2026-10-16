import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { requireDatabaseMode } from "@/lib/database-service";
import { createProvisionedUser, createUserSchema, listProvisionedUsers, requireProvisioningRole } from "@/lib/provisioning-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    requireDatabaseMode();
    const actor = await getActorFromSession();
    requirePermission(actor.role, "admin:read");
    return jsonResponse(await listProvisionedUsers(actor));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    requireDatabaseMode();
    const actor = await getActorFromSession();
    requirePermission(actor.role, "accounts:manage");
    const input = createUserSchema.parse(await readJson(request));
    requireProvisioningRole(actor, input.role);
    return jsonResponse(await createProvisionedUser(actor, input), 201);
  } catch (error) { return errorResponse(error); }
}
