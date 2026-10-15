import { getSession } from "@/lib/auth";
import { getChildProfile, getAuthorizedChildren } from "@/lib/data";
import { ParentProgressView } from "@/components/parent-progress";
import { config } from "@/lib/config";
import { getDatabaseChildProfile } from "@/lib/database-service";

export default async function ParentChildProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;
  const profile = config.dataMode === "sqlite"
    ? await getDatabaseChildProfile(session, id) as unknown as Awaited<ReturnType<typeof getChildProfile>>
    : getChildProfile(session, id);
  const children = getAuthorizedChildren(session);
  return <ParentProgressView session={session} profile={profile} children={children} />;
}
