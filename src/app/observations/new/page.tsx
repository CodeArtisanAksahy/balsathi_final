import { getSession } from "@/lib/auth";
import { ObservationForm } from "@/components/observation-form";

export default async function NewObservationPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string; method?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const params = await searchParams;
  return (
    <ObservationForm
      session={session}
      initialChildId={params.childId}
      initialMethod={(params.method as any) ?? "TEXT"}
    />
  );
}
