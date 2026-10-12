import { getSession } from "@/lib/auth";
import { getChildrenDirectory, getCenters } from "@/lib/data";
import { ChildrenDirectory } from "@/components/children-directory";

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
  const result = getChildrenDirectory(session, filters);
  const centers = getCenters(session);
  return <ChildrenDirectory session={session} result={result} centers={centers} filters={filters} />;
}
