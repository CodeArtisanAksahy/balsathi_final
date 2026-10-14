import { getSession } from "@/lib/auth";
import { getAuthorizedChildren } from "@/lib/data";
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
  return <GrowthComparison session={session} selectedChildId={childId} />;
}
