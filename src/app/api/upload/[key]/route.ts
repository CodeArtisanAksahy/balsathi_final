import { readStoredFile } from "@/lib/storage";
import { errorResponse } from "@/lib/api";
import { getActorFromSession, requireCenterAccess, requirePermission } from "@/lib/authorization";
import { getDemoStore } from "@/lib/demo-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "children:read");
    const { key } = await context.params;
    if (!key) return new Response("Not found", { status: 404 });
    const decodedKey = decodeURIComponent(key);
    const attachment = getDemoStore().attachments.find((item) => item.storageKey === decodedKey);
    if (!attachment) return new Response("Not found", { status: 404 });
    const child = getDemoStore().children.find((item) => item.id === attachment.childId);
    if (!child) return new Response("Not found", { status: 404 });
    requireCenterAccess(session, child.centerId);
    const { buffer, mimeType } = await readStoredFile(decodedKey);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    const err = error as Error;
    if (err.message === "FORBIDDEN_KEY") return new Response("Forbidden", { status: 403 });
    return errorResponse(error);
  }
}
