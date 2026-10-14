import { getSession } from "@/lib/auth";
import { getAuthorizedChildren } from "@/lib/data";
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
  return <MilestoneJourney session={session} selectedChildId={childId} />;
}
