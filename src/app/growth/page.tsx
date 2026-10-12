import { getSession } from "@/lib/auth";
import { getAuthorizedChildren, getGrowthSeries } from "@/lib/data";
import { GrowthComparison } from "@/components/growth-comparison";

export default async function GrowthPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const params = await searchParams;
  const children = getAuthorizedChildren(session);
  const childId = params.childId ?? children[0]?.id ?? "";
  const growth = childId ? getGrowthSeries(session, childId) : [];
  const selectedChild = children.find((c) => c.id === childId) ?? null;
  return <GrowthComparison session={session} children={children} selectedChild={selectedChild} growth={growth} />;
}
