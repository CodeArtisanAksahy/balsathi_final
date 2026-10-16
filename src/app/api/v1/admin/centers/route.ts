import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { requireDatabaseMode } from "@/lib/database-service";
import { createCenterSchema, createProvisionedCenter, listProvisionedCenters } from "@/lib/provisioning-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    requireDatabaseMode();
    const actor = await getActorFromSession();
    requirePermission(actor.role, "admin:read");
    return jsonResponse(await listProvisionedCenters(actor));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    requireDatabaseMode();
    const actor = await getActorFromSession();
    requirePermission(actor.role, "admin:write");
    return jsonResponse(await createProvisionedCenter(actor, createCenterSchema.parse(await readJson(request))), 201);
  } catch (error) { return errorResponse(error); }
}
