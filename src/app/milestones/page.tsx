import { getSession } from "@/lib/auth";
import { getAuthorizedChildren, getChildMilestoneAssessments, getMilestoneDefinitions } from "@/lib/data";
import { MilestoneJourney } from "@/components/milestone-journey";

export default async function MilestonesPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const params = await searchParams;
  const children = getAuthorizedChildren(session);
  const childId = params.childId ?? children[0]?.id ?? "";
  const milestones = getMilestoneDefinitions();
  const assessments = childId ? getChildMilestoneAssessments(session, childId) : [];
  const selectedChild = children.find((c) => c.id === childId) ?? null;
  return <MilestoneJourney session={session} children={children} selectedChild={selectedChild} milestones={milestones} assessments={assessments} />;
}
