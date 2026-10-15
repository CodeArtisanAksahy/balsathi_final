import { readStoredFile } from "@/lib/storage";
import { errorResponse } from "@/lib/api";
import { ApiError, getActorFromSession, requirePermission } from "@/lib/authorization";
import { getDemoStore } from "@/lib/demo-store";
import { assertChildAccess } from "@/lib/data";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
): Promise<Response> {
  try {
    const session = await getActorFromSession();
    if (config.dataMode === "sqlite") throw new ApiError(501, "UPLOAD_NOT_CONFIGURED", "Database-backed attachment records are not configured for SQLite mode.");
    requirePermission(session.role, "children:read");
    const { key } = await context.params;
    if (!key) return new Response("Not found", { status: 404 });
    const decodedKey = decodeURIComponent(key);
    const attachment = getDemoStore().attachments.find((item) => item.storageKey === decodedKey);
    if (!attachment) return new Response("Not found", { status: 404 });
    const child = getDemoStore().children.find((item) => item.id === attachment.childId);
    if (!child) return new Response("Not found", { status: 404 });
    assertChildAccess(session, child.id);
    const { buffer, mimeType } = await readStoredFile(decodedKey);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    const err = error as Error;
    if (err.message === "FORBIDDEN_KEY") return new Response("Forbidden", { status: 403 });
    if (err.message === "NOT_FOUND" || (error as NodeJS.ErrnoException).code === "ENOENT") return new Response("Not found", { status: 404 });
    return errorResponse(error);
  }
}
