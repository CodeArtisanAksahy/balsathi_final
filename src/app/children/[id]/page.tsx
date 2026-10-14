import { getSession } from "@/lib/auth";
import { getChildProfile } from "@/lib/data";
import { ChildProfileView } from "@/components/child-profile";
import { config } from "@/lib/config";
import { getDatabaseChildProfile } from "@/lib/postgres-service";

export default async function ChildProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;
  const profile = config.dataMode === "postgres"
    ? await getDatabaseChildProfile(session, id) as unknown as Awaited<ReturnType<typeof getChildProfile>>
    : getChildProfile(session, id);
  return <ChildProfileView session={session} profile={profile} />;
}
