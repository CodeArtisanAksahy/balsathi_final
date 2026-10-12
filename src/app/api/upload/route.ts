import { errorResponse, jsonResponse } from "@/lib/api";
import { ApiError, getActorFromSession, requireCenterAccess, requirePermission } from "@/lib/authorization";
import { appendAudit, getDemoStore, newId } from "@/lib/demo-store";
import type { AttachmentKind, AttachmentRecord } from "@/lib/domain";
import { uploadFile } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "observations:create");
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const childId = formData.get("childId") as string | null;
    const kind = (formData.get("kind") as string | null) || "IMAGE";
    const consentVerified = formData.get("consentVerified") === "true";

    if (!file || !childId) {
      throw new ApiError(400, "MISSING_FIELDS", "File and childId are required.");
    }

    const data = getDemoStore();
    const child = data.children.find((c) => c.id === childId);
    if (!child) {
      throw new ApiError(404, "CHILD_NOT_FOUND", "Child not found.");
    }
    requireCenterAccess(session, child.centerId);

    const storageKey = `uploads/${childId}/${Date.now()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await uploadFile(storageKey, buffer, file.type || "application/octet-stream");

    const now = new Date().toISOString();
    const attachment: AttachmentRecord = {
      id: newId("attachment"),
      observationId: null,
      childId,
      kind: kind as AttachmentKind,
      fileName: file.name,
      storageKey,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      uploadedById: session.id,
      consentVerified,
      createdAt: now,
      updatedAt: now,
    };
    data.attachments.push(attachment);
    appendAudit(data, {
      actorId: session.id,
      action: "attachment.uploaded",
      entityType: "Attachment",
      entityId: attachment.id,
      scopeCenterId: child.centerId,
      metadata: { childId, kind },
    });

    return jsonResponse({ ...attachment, url }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
