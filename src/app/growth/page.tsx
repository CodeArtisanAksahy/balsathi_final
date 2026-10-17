import { getSession } from "@/lib/auth";
import { getAuthorizedChildren } from "@/lib/data";
import { GrowthComparison } from "@/components/growth-comparison";
import { config } from "@/lib/config";
import { listDatabaseChildren } from "@/lib/database-service";
import { ParentGrowthJourney } from "@/components/parent-growth-journey";

export default async function GrowthPage({
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
  if (session.role === "PARENT") return <ParentGrowthJourney session={session} selectedChildId={childId} />;
  return <GrowthComparison session={session} selectedChildId={childId} initialChildren={children.map(({ id, fullName }) => ({ id, fullName }))} sqliteMode={config.dataMode === "sqlite"} />;
}
