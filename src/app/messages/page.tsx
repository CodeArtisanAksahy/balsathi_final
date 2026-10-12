import { getSession } from "@/lib/auth";
import { getAuthorizedChildren, getCenters, getChildMessages } from "@/lib/data";
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
  const centers = getCenters(session);
  const selectedChildId = params.childId ?? children[0]?.id ?? "";
  const messages = selectedChildId ? getChildMessages(session, selectedChildId) : [];
  return (
    <MessagesView
      session={session}
      children={children}
      centers={centers}
      selectedChildId={selectedChildId}
      messages={messages}
    />
  );
}
