import { getSession } from "@/lib/auth";
import { getAuthorizedChildren } from "@/lib/data";
import { MilestoneJourney } from "@/components/milestone-journey";
import { config } from "@/lib/config";
import { listDatabaseChildren } from "@/lib/database-service";

export default async function MilestonesPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const params = await searchParams;
  const children = config.dataMode === "sqlite"
    ? (await listDatabaseChildren(session, { page: 1, pageSize: 100, sort: "name" })).items
    : getAuthorizedChildren(session);
  const childId = params.childId ?? children[0]?.id ?? "";
  return <MilestoneJourney session={session} selectedChildId={childId} sqliteMode={config.dataMode === "sqlite"} initialChildren={children.map(({ id, fullName, dateOfBirth }) => ({ id, fullName, dateOfBirth: typeof dateOfBirth === "string" ? dateOfBirth : dateOfBirth.toISOString() }))} />;
}
