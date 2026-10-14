import { getSession } from "@/lib/auth";
import { getAuthorizedChildren } from "@/lib/data";
import { MessagesView } from "@/components/messages-view";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const params = await searchParams;
  const children = getAuthorizedChildren(session);
  const childId = params.childId ?? children[0]?.id ?? "";
  return <MessagesView session={session} selectedChildId={childId} />;
}
