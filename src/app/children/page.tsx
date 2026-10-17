import { getSession } from "@/lib/auth";
import { getCenters } from "@/lib/data";
import { ChildrenDirectory } from "@/components/children-directory";
import { config } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export default async function ChildrenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; centerId?: string; status?: string; ageGroup?: string; sort?: string; page?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const params = await searchParams;
  const filters = {
    q: params.q,
    centerId: params.centerId,
    status: (params.status as any) ?? "all",
    ageGroup: (params.ageGroup as any) ?? "all",
    sort: (params.sort as any) ?? "name",
    page: params.page ? parseInt(params.page) : 1,
    pageSize: 6,
  };
  const centers = config.dataMode === "sqlite"
    ? await prisma.center.findMany({ where: session.role === "DISTRICT_ADMIN" ? { active: true } : { active: true, id: { in: session.centerIds } }, select: { id: true, name: true }, orderBy: { name: "asc" } })
    : getCenters(session);
  return <ChildrenDirectory session={session} centers={centers} filters={filters} />;
}
