import { getSession } from "@/lib/auth";
import { getAuthorizedChildren, getChildProfile } from "@/lib/data";
import { AiInsightsView } from "@/components/ai-insights";
import { getDemoStore } from "@/lib/demo-store";

export default async function AiInsightsPage() {
  const session = await getSession();
  if (!session) return null;

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
