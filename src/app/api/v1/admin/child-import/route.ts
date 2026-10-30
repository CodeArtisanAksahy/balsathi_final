import { errorResponse, jsonResponse } from "@/lib/api";
import { ApiError, getActorFromSession, requirePermission } from "@/lib/authorization";
import { commitChildImport, previewChildImport } from "@/lib/child-import";
import { requireDatabaseMode } from "@/lib/database-service";
import { assertSameOrigin, enforceConfiguredRateLimit } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_CSV_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    requireDatabaseMode(); assertSameOrigin(request); await enforceConfiguredRateLimit(request, "child-import", 5, 60_000);
    const actor = await getActorFromSession(); requirePermission(actor.role, "admin:write");
    const form = await request.formData(); const file = form.get("file"); const action = form.get("action");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) throw new ApiError(400, "CSV_REQUIRED", "Upload a .csv file.");
    if (!file.size || file.size > MAX_CSV_BYTES) throw new ApiError(413, "CSV_TOO_LARGE", "CSV must be between 1 byte and 2 MB.");
    const csv = await file.text();
    if (action === "preview") return jsonResponse((await previewChildImport(csv)).preview);
    if (action !== "commit" || form.get("confirm") !== "IMPORT_AUTHORIZED") throw new ApiError(400, "IMPORT_CONFIRMATION_REQUIRED", "Preview the file and confirm the authorized import before committing.");
    const expectedHash = form.get("previewHash"); if (typeof expectedHash !== "string" || !/^[a-f0-9]{64}$/.test(expectedHash)) throw new ApiError(400, "PREVIEW_HASH_REQUIRED", "A valid preview hash is required.");
    return jsonResponse(await commitChildImport(actor, csv, expectedHash, form.get("enforceAssignmentPlan") === "true"), 201);
  } catch (error) { return errorResponse(error); }
}
