import { errorResponse, jsonResponse } from "@/lib/api";
import { ApiError, getActorFromSession, requirePermission } from "@/lib/authorization";
import { assertChildAccess } from "@/lib/data";
import { appendAudit, getDemoStore, newId } from "@/lib/demo-store";
import { attachmentKinds, type AttachmentKind, type AttachmentRecord } from "@/lib/domain";
import { uploadFile } from "@/lib/storage";
import { config } from "@/lib/config";
import { randomUUID } from "node:crypto";
import { assertSameOrigin } from "@/lib/request-security";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "image/jpeg", "image/png", "image/webp",
  "audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm",
  "application/pdf",
]);
const safeExtensionByMime: Record<string, string> = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
  "audio/mpeg": ".mp3", "audio/mp4": ".m4a", "audio/wav": ".wav",
  "audio/ogg": ".ogg", "audio/webm": ".webm", "application/pdf": ".pdf",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const session = await getActorFromSession();
    requirePermission(session.role, "observations:create");
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES + 64 * 1024) {
      throw new ApiError(413, "UPLOAD_TOO_LARGE", `File must not exceed ${MAX_UPLOAD_BYTES} bytes.`);
    }
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const childId = formData.get("childId") as string | null;
    const kind = ((formData.get("kind") as string | null) || "IMAGE") as AttachmentKind;
    const consentVerified = formData.get("consentVerified") === "true";

    if (!file || !childId) {
      throw new ApiError(400, "MISSING_FIELDS", "File and childId are required.");
    }
    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      throw new ApiError(413, "UPLOAD_TOO_LARGE", `File must be between 1 byte and ${MAX_UPLOAD_BYTES} bytes.`);
    }
    if (!allowedMimeTypes.has(file.type) || !attachmentKinds.includes(kind)) {
      throw new ApiError(415, "UNSUPPORTED_FILE", "This file type is not supported.");
    }
    if ((kind === "IMAGE" && !file.type.startsWith("image/")) || (kind === "AUDIO" && !file.type.startsWith("audio/")) || (kind === "DOCUMENT" && file.type !== "application/pdf")) {
      throw new ApiError(415, "FILE_KIND_MISMATCH", "The selected file does not match its attachment type.");
    }

    let centerIdForAudit: string | null = null;
    if (config.dataMode === "sqlite") {
      const { requireDatabaseChildAccess } = await import("@/lib/authorization");
      const child = await requireDatabaseChildAccess(session, childId);
      centerIdForAudit = child.centerId;
    } else {
      const data = getDemoStore();
      const child = data.children.find((c) => c.id === childId);
      if (!child) throw new ApiError(404, "CHILD_NOT_FOUND", "Child not found.");
      assertChildAccess(session, child.id);
      centerIdForAudit = child.centerId;
    }

    const storageKey = `uploads/${childId}/${randomUUID()}${safeExtensionByMime[file.type]}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await uploadFile(storageKey, buffer, file.type || "application/octet-stream");

    const now = new Date().toISOString();
    const attachmentId = config.dataMode === "sqlite" ? randomUUID() : newId("attachment");
    if (config.dataMode === "sqlite") {
      const { prisma } = await import("@/lib/prisma");
      await prisma.attachmentRecord.create({
        data: {
          id: attachmentId,
          observationId: null,
          childId,
          kind: kind as AttachmentKind,
          fileName: file.name,
          storageKey,
          mimeType: file.type,
          sizeBytes: file.size,
          uploadedById: session.id,
          consentVerified,
        },
      });
      const { prisma: prisma2 } = await import("@/lib/prisma");
      await prisma2.auditLog.create({
        data: { actorId: session.id, action: "attachment.uploaded", entityType: "Attachment", entityId: attachmentId, scopeCenterId: centerIdForAudit, metadata: { childId, kind } },
      });
    } else {
      const data = getDemoStore();
      const attachment: AttachmentRecord = {
        id: attachmentId,
        observationId: null,
        childId,
        kind: kind as AttachmentKind,
        fileName: file.name,
        storageKey,
        mimeType: file.type,
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
        scopeCenterId: centerIdForAudit,
        metadata: { childId, kind },
      });
    }

    const attachment = {
      id: attachmentId,
      observationId: null,
      childId,
      kind: kind as AttachmentKind,
      fileName: file.name,
      storageKey,
      mimeType: file.type,
      sizeBytes: file.size,
      uploadedById: session.id,
      consentVerified,
      createdAt: now,
      updatedAt: now,
    };
    return jsonResponse({ ...attachment, url }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
