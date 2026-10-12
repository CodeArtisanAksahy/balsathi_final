import { errorResponse, jsonResponse } from "@/lib/api";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const session = await getSession();
    return jsonResponse(session);
  } catch (error) {
    return errorResponse(error);
  }
}
