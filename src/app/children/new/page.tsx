import { getSession } from "@/lib/auth";
import { getCenters, getWorkers } from "@/lib/data";
import { AddChildForm } from "@/components/add-child-form";
import { config } from "@/lib/config";
import { requirePermission } from "@/lib/authorization";
import { getDatabaseChildRegistrationOptions } from "@/lib/database-service";

export default async function AddChildPage() {
  const session = await getSession();
  if (!session) return null;
  requirePermission(session.role, "children:create");
  let centers: Array<{ id: string; name: string }>;
  let workers: Array<{ id: string; name: string; centerIds: string[] }>;
  if (config.dataMode === "sqlite") {
    ({ centers, workers } = await getDatabaseChildRegistrationOptions(session));
  } else {
    centers = getCenters(session).map(({ id, name }) => ({ id, name }));
    workers = getWorkers(session).map(({ id, name, centerIds }) => ({ id, name, centerIds }));
  }
  return <AddChildForm session={session} centers={centers} workers={workers} />;
}
