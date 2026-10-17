import { getSession } from "@/lib/auth";
import { RecommendationsView } from "@/components/recommendations-view";

export default async function ParentActivitiesPage({ searchParams }: { searchParams: Promise<{ childId?: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { childId } = await searchParams;
  return <RecommendationsView session={session} selectedChildId={childId} />;
}
