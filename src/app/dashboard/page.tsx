import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { DashboardContent } from "@/components/dashboard-content";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;
  if (session.role === "CENTER_ADMIN" || session.role === "DISTRICT_ADMIN") redirect("/admin/dashboard");
  // Data is now read from the reactive client store; server data is for initial SSR only.
  const data = getDashboardData(session);
  return <DashboardContent session={session} data={data} />;
}
