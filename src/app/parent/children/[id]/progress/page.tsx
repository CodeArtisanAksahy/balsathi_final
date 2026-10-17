import { getSession } from "@/lib/auth";
import { getChildProfile } from "@/lib/data";
import { ParentProgressView } from "@/components/parent-progress";
import { config } from "@/lib/config";
import { getDatabaseChildProfile } from "@/lib/database-service";
import { resolveProfileChildId } from "@/lib/child-profile-utils";

export default async function ParentChildProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;
  const profile = config.dataMode === "sqlite"
    ? await getDatabaseChildProfile(session, id)
    : getChildProfile(session, id);
  const childId = resolveProfileChildId(profile);
  return <ParentProgressView session={session} profile={{ child: { id: childId } }} />;
}
