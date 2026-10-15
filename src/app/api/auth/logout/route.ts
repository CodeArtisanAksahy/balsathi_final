import { errorResponse, jsonResponse } from "@/lib/api";
import { clearSession, getSession } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    await clearSession();
    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(): Promise<Response> {
  try {
    const session = await getSession();
    return jsonResponse(session);
  } catch (error) {
    return errorResponse(error);
  }
}
