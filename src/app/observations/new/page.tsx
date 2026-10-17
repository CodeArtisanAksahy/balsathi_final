import { getSession } from "@/lib/auth";
import { ObservationForm } from "@/components/observation-form";
import { config } from "@/lib/config";
import { listDatabaseChildren } from "@/lib/database-service";
import { ObservationMethodPicker } from "@/components/observation-method-picker";

export default async function NewObservationPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string; method?: string; compose?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  if (session.role === "PARENT") {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-stone-800">Observations</h1>
        <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Parents can view their child&apos;s observations, but official observations are recorded by an Anganwadi worker or administrator. Contact your center if a record needs to be added or corrected.
        </div>
      </div>
    );
  }
  const params = await searchParams;
  if (params.compose !== "1") {
    return <ObservationMethodPicker sqliteMode={config.dataMode === "sqlite"} childId={params.childId} />;
  }
  const databaseChildren = config.dataMode === "sqlite"
    ? (await listDatabaseChildren(session, { page: 1, pageSize: 100, sort: "name" })).items
    : undefined;
  return (
    <ObservationForm
      session={session}
      sqliteMode={config.dataMode === "sqlite"}
      initialChildren={databaseChildren?.map(({ id, fullName }) => ({ id, fullName }))}
      initialChildId={params.childId ?? databaseChildren?.[0]?.id}
      initialMethod={(params.method as any) ?? "TEXT"}
    />
  );
}
