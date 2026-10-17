"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, Baby } from "lucide-react";
import { useState, useEffect } from "react";
import type { SessionUser } from "@/lib/domain";
import { ageLabel, formatDate } from "@/lib/utils";
import { useStoreSelector } from "@/hooks/use-store";
import { getAgeGroupDistribution, getChildrenDirectory } from "@/lib/selectors";

const childAvatarTones = [
  "bg-[#e8f1e6] text-[#426c46]",
  "bg-[#f0e9fa] text-[#8256b1]",
  "bg-[#fff0df] text-[#a86120]",
  "bg-[#e6f2f8] text-[#347ea6]",
  "bg-[#fbe9e8] text-[#bb5b55]",
];

export function ChildrenDirectory({
  session,
  centers,
  filters,
}: {
  session: SessionUser;
  centers: Array<{ id: string; name: string }>;
  filters: Record<string, any>;
}) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q ?? "");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => setQ(filters.q ?? ""), [filters.q]);

  const result = useStoreSelector((state) => getChildrenDirectory(state, session, {
    q: filters.q,
    centerId: filters.centerId,
    status: filters.status ?? "all",
    ageGroup: filters.ageGroup ?? "all",
    sort: filters.sort ?? "name",
    page: filters.page ?? 1,
    pageSize: 5,
  }));
  const ageGroups = useStoreSelector((state) => getAgeGroupDistribution(state, session));
  const allChildrenTotal = useStoreSelector((state) => getChildrenDirectory(state, session, { page: 1, pageSize: 1 }).total);

  function applyFilters(newFilters: Record<string, string | number>) {
    const params = new URLSearchParams();
    Object.entries({ ...filters, ...newFilters, page: 1 }).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value) !== "" && String(value) !== "all") params.set(key, String(value));
    });
    router.push(`/children?${params.toString()}`);
  }

  function goToPage(page: number) {
    const params = new URLSearchParams();
    Object.entries({ ...filters, page }).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value) !== "" && String(value) !== "all") params.set(key, String(value));
    });
    router.push(`/children?${params.toString()}`);
  }

  const ageTabs = [
    { label: "All", value: "all", count: allChildrenTotal },
    { label: "0–2 Years", value: "0-2", count: ageGroups[0]?.count ?? 0 },
    { label: "2–4 Years", value: "2-4", count: (ageGroups[1]?.count ?? 0) + (ageGroups[2]?.count ?? 0) },
    { label: "4–6 Years", value: "4-6", count: (ageGroups[3]?.count ?? 0) + (ageGroups[4]?.count ?? 0) },
  ];
  const currentPage = result.page;
  const firstItem = result.total === 0 ? 0 : (currentPage - 1) * result.pageSize + 1;
  const lastItem = Math.min(currentPage * result.pageSize, result.total);

  return (
    <main className="space-y-4 pb-6">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-stone-800">{session.role === "PARENT" ? "My Children" : "Children"}</h1>
          <p className="mt-0.5 text-xs text-stone-500">{result.total} children in this view</p>
        </div>
        {session.role !== "PARENT" && <Link href="/children/new" className="btn-primary shrink-0 px-3 py-2 text-xs sm:px-4 sm:text-sm"><Baby className="h-4 w-4" /><span>Add Child</span></Link>}
      </header>

      <section aria-label="Search and filter children" className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input value={q} onChange={(event) => setQ(event.target.value)} onKeyDown={(event) => event.key === "Enter" && applyFilters({ q })} placeholder="Search child by name…" className="input h-10 rounded-full border-[#e9e5d9] bg-white pl-9 text-xs sm:text-sm" aria-label="Search child by name" />
        </div>
        <button type="button" onClick={() => setShowFilters((value) => !value)} className="btn-secondary h-10 w-10 shrink-0 rounded-full p-0" aria-label={showFilters ? "Hide filters" : "Show filters"} aria-expanded={showFilters}><SlidersHorizontal className="h-4 w-4" /></button>
      </section>

      {showFilters && <section className="card grid grid-cols-2 gap-3 border-[#e9e5d9] bg-white p-4 md:grid-cols-4">
        <div><label className="label">Center</label><select className="input" value={filters.centerId ?? ""} onChange={(event) => applyFilters({ centerId: event.target.value })}><option value="">All centers</option>{centers.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}</select></div>
        <div><label className="label">Status</label><select className="input" value={filters.status ?? "all"} onChange={(event) => applyFilters({ status: event.target.value })}><option value="all">All</option><option value="follow-up">Follow-up</option><option value="stable">No active follow-up</option></select></div>
        <div><label className="label">Age group</label><select className="input" value={filters.ageGroup ?? "all"} onChange={(event) => applyFilters({ ageGroup: event.target.value })}><option value="all">All ages</option><option value="0-2">0–2 years</option><option value="2-4">2–4 years</option><option value="4-6">4–6 years</option></select></div>
        <div><label className="label">Sort by</label><select className="input" value={filters.sort ?? "name"} onChange={(event) => applyFilters({ sort: event.target.value })}><option value="name">Name</option><option value="recent">Recent observation</option><option value="age">Age</option></select></div>
      </section>}

      <nav aria-label="Filter by age group" className="flex items-stretch justify-between gap-1 overflow-x-auto border-b border-[#e9e5d9]">
        {ageTabs.map((tab) => {
          const active = (filters.ageGroup ?? "all") === tab.value;
          return <button key={tab.value} type="button" onClick={() => applyFilters({ ageGroup: tab.value })} aria-current={active ? "page" : undefined} className={`shrink-0 border-b-2 px-2 pb-2 pt-1 text-[10px] font-medium transition sm:px-3 sm:text-xs ${active ? "border-[#4e8054] text-[#3c6843]" : "border-transparent text-stone-500 hover:text-stone-700"}`}>
            {tab.label} <span className={active ? "text-[#658b65]" : "text-stone-400"}>({tab.count})</span>
          </button>;
        })}
      </nav>

      <section aria-label="Children" className="card divide-y divide-[#f0eee8] overflow-hidden border-[#e9e5d9] bg-white">
        {result.items.map((child, index) => {
          const risk = child.risks[0];
          const riskTone = risk?.level === "HIGH" ? "bg-[#fde8e5] text-[#b64037]" : risk?.level === "LOW" ? "bg-[#e8f1e6] text-[#426c46]" : "bg-[#fff0df] text-[#a86120]";
          return <Link key={child.id} href={`/children/${child.id}`} className="flex items-center gap-2.5 px-3 py-3 transition-colors hover:bg-[#fcfbf7] sm:gap-3.5 sm:px-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold sm:h-11 sm:w-11 ${childAvatarTones[index % childAvatarTones.length]}`}>{child.fullName.slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xs font-semibold text-stone-800 sm:text-sm">{child.fullName}</h2>
              <p className="mt-0.5 truncate text-[10px] text-stone-500 sm:text-xs">{child.gender === "UNSPECIFIED" ? "" : `${child.gender.charAt(0)}${child.gender.slice(1).toLowerCase()} · `}{ageLabel(child.dateOfBirth)}{child.center?.name ? ` · ${child.center.name}` : ""}</p>
            </div>
            <div className="flex max-w-[44%] shrink-0 flex-col items-end gap-1">
              <span className={`badge max-w-full truncate px-2 py-0.5 text-[9px] sm:text-[10px] ${risk ? riskTone : "bg-[#e8f1e6] text-[#426c46]"}`}>{risk ? `${risk.level === "MODERATE" ? "Medium" : risk.level} Risk` : "No open follow-up"}</span>
              {risk?.title && <span className="max-w-full truncate rounded-full bg-[#f0e9fa] px-2 py-0.5 text-[9px] text-[#76549a]">{risk.title}</span>}
            </div>
          </Link>;
        })}
        {result.items.length === 0 && <div className="px-5 py-12 text-center"><Baby className="mx-auto mb-2 h-9 w-9 text-[#b8c9ae]" /><p className="text-sm text-stone-600">No children found matching these filters.</p><p className="mt-1 text-xs text-stone-400">Try another name, age group, or center.</p></div>}
      </section>

      {result.pageCount > 1 && <nav aria-label="Children pages" className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-stone-500 sm:text-xs">
        <span>Showing {firstItem} to {lastItem} of {result.total} children</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} aria-label="Previous page" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e9e5d9] bg-white text-stone-600 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          {Array.from({ length: result.pageCount }, (_, index) => index + 1).map((page) => <button key={page} type="button" onClick={() => goToPage(page)} aria-current={page === currentPage ? "page" : undefined} className={`h-8 min-w-8 rounded-lg px-2 text-xs ${page === currentPage ? "bg-[#e8f1e6] font-semibold text-[#426c46]" : "text-stone-500 hover:bg-white"}`}>{page}</button>)}
          <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= result.pageCount} aria-label="Next page" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e9e5d9] bg-white text-stone-600 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </nav>}
    </main>
  );
}
