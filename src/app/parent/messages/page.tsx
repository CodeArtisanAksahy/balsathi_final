import { ParentInbox } from "@/components/parent-inbox";
import { getSession } from "@/lib/auth";
export default async function ParentMessagesPage() {
  const session = await getSession();
  if (!session) return null;
  return <ParentInbox session={session} />;
}
