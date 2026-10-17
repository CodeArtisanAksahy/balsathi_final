import { getSession } from "@/lib/auth";
import { getAuthorizedChildren } from "@/lib/data";
import { AiInsightsView } from "@/components/ai-insights";
import { getDemoStore } from "@/lib/demo-store";
import { config } from "@/lib/config";
import { childScopeWhere } from "@/lib/database-service";
import { prisma } from "@/lib/prisma";
import type { Child, MilestoneAssessment, Observation, RiskAssessment } from "@/lib/domain";

export default async function AiInsightsPage() {
  const session = await getSession();
  if (!session) return null;

  if (config.dataMode === "sqlite") {
    const children = await prisma.child.findMany({ where: childScopeWhere(session) });
    const childIds = children.map((child) => child.id);
    const [risks, observations, assessments] = await prisma.$transaction([
      prisma.riskAssessment.findMany({ where: { childId: { in: childIds }, reviewRequired: true }, orderBy: { createdAt: "desc" } }),
      prisma.observation.findMany({ where: { childId: { in: childIds } }, orderBy: { observedAt: "desc" } }),
      prisma.milestoneAssessment.findMany({ where: { childId: { in: childIds } }, orderBy: { assessedAt: "desc" } }),
    ]);
    const childById = new Map(children.map((child) => [child.id, child as unknown as Child]));
    return <AiInsightsView
      session={session}
      risks={risks.map((risk) => ({ ...risk, createdAt: risk.createdAt.toISOString(), updatedAt: risk.updatedAt.toISOString(), level: risk.level as RiskAssessment["level"], child: childById.get(risk.childId) })) as (RiskAssessment & { child: Child | undefined })[]}
      observations={observations.map((row) => ({ ...row, observedAt: row.observedAt.toISOString(), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), method: row.method as Observation["method"], domain: row.domain as Observation["domain"], reviewStatus: row.reviewStatus as Observation["reviewStatus"], attachmentIds: Array.isArray(row.attachmentIds) ? row.attachmentIds as string[] : [] })) as Observation[]}
      assessments={assessments.map((row) => ({ ...row, assessedAt: row.assessedAt.toISOString(), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), status: row.status as MilestoneAssessment["status"] })) as MilestoneAssessment[]}
    />;
  }

  const store = getDemoStore();
  const children = getAuthorizedChildren(session);
  const childIds = new Set(children.map((c) => c.id));

  const risks = store.riskAssessments
    .filter((r) => childIds.has(r.childId))
    .map((r) => ({ ...r, child: children.find((c) => c.id === r.childId) }));

  const observations = store.observations.filter((o) => childIds.has(o.childId));
  const assessments = store.milestoneAssessments.filter((a) => childIds.has(a.childId));

  return <AiInsightsView session={session} risks={risks} observations={observations} assessments={assessments} />;
}
