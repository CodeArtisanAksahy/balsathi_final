import { errorResponse, jsonResponse } from "@/lib/api";
import { clearSession, getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  try {
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
