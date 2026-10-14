import { getSession } from "@/lib/auth";
import { getChildProfile, getAuthorizedChildren } from "@/lib/data";
import { ParentProgressView } from "@/components/parent-progress";

export default async function ParentChildProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;
  const profile = getChildProfile(session, id);
  const children = getAuthorizedChildren(session);
  return <ParentProgressView session={session} profile={profile} children={children} />;
}
