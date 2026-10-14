import { getSession } from "@/lib/auth";
import { getCenters, getWorkers } from "@/lib/data";
import { AddChildForm } from "@/components/add-child-form";

export default async function AddChildPage() {
  const session = await getSession();
  if (!session) return null;
  const centers = getCenters(session);
  const workers = getWorkers(session);
  return <AddChildForm session={session} centers={centers} workers={workers} />;
}
