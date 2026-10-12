import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { generateReport, getChildReports } from "@/lib/data";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reportGenerateSchema = z.object({
  childId: z.string().min(1),
});

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "reports:read");
    const childId = new URL(request.url).searchParams.get("childId");
    if (!childId) return jsonResponse([]);
    const reports = getChildReports(session, childId);
    return jsonResponse(reports);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "reports:create");
    const input = reportGenerateSchema.parse(await readJson(request));
    const report = generateReport(session, input.childId);
    return jsonResponse(report, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
