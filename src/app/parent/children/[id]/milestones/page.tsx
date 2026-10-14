import { getSession } from "@/lib/auth";
import { MilestoneJourney } from "@/components/milestone-journey";

export default async function ParentChildMilestonesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;
  return <MilestoneJourney session={session} selectedChildId={id} />;
}
