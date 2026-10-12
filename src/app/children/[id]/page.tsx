import { getSession } from "@/lib/auth";
import { getChildProfile } from "@/lib/data";
import { ChildProfileView } from "@/components/child-profile";

export default async function ChildProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;
  const profile = getChildProfile(session, id);
  return <ChildProfileView session={session} profile={profile} />;
}
