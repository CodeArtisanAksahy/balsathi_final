import { errorResponse, jsonResponse } from "@/lib/api";
import { getActorFromSession } from "@/lib/authorization";
import { getAnalyticsSeries } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const session = await getActorFromSession();
    const data = getAnalyticsSeries(session);
    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
