import { getSession } from "@/lib/auth";
import { getAuthorizedChildren } from "@/lib/data";
import { RecommendationsView } from "@/components/recommendations-view";

export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const params = await searchParams;
  const children = getAuthorizedChildren(session);
  const childId = params.childId ?? children[0]?.id ?? "";
  return <RecommendationsView session={session} selectedChildId={childId} />;
}
