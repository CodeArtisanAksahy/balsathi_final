import { getSession } from "@/lib/auth";
import { ParentObservations } from "@/components/parent-observations";

export default async function ParentObservationsPage({ searchParams }: { searchParams: Promise<{ childId?: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { childId } = await searchParams;
  return <ParentObservations session={session} requestedChildId={childId} />;
}
