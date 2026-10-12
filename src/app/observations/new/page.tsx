import { getSession } from "@/lib/auth";
import { getAuthorizedChildren, getMilestoneDefinitions } from "@/lib/data";
import { ObservationForm } from "@/components/observation-form";

export default async function NewObservationPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string; method?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const params = await searchParams;
  const children = getAuthorizedChildren(session);
  const milestones = getMilestoneDefinitions();
  return (
    <ObservationForm
      session={session}
      children={children}
      milestones={milestones}
      initialChildId={params.childId}
      initialMethod={(params.method as any) ?? "TEXT"}
    />
  );
}
