import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { addRecommendation, getChildRecommendations } from "@/lib/data";
import { z } from "zod";
import { appLocales } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const recommendationSchema = z.object({
  childId: z.string().min(1),
  locale: z.enum(appLocales),
  title: z.string().min(2).max(200),
  description: z.string().min(5).max(2000),
  approvedForParent: z.boolean().default(false),
});

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "reports:read");
    const childId = new URL(request.url).searchParams.get("childId");
    if (!childId) return jsonResponse([]);
    const recs = getChildRecommendations(session, childId);
    return jsonResponse(recs);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "reports:create");
    const input = recommendationSchema.parse(await readJson(request));
    const rec = addRecommendation(session, input);
    return jsonResponse(rec, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
