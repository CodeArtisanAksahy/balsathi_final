"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Filter, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Baby } from "lucide-react";
import { useState, useEffect } from "react";
import type { SessionUser } from "@/lib/domain";
import { getMessages } from "@/lib/i18n";
import { ageLabel, formatDate, cn } from "@/lib/utils";
import { useStoreSelector } from "@/hooks/use-store";
import { getChildrenDirectory } from "@/lib/selectors";

type ChildItem = {
  id: string;
  fullName: string;
  internalId: string;
  dateOfBirth: string;
  centerId: string;
  risks: Array<{ level: string; title: string }>;
  center: { name: string } | null;
  latestObservation: { observedAt: string } | null | undefined;
};

export function ChildrenDirectory({
  session,
  result: _initialResult,
  centers,
  filters,
}: {
  session: SessionUser;
  result?: { items: ChildItem[]; total: number; page: number; pageSize: number; pageCount: number };
  centers: Array<{ id: string; name: string }>;
  filters: Record<string, any>;
}) {
  const router = useRouter();
  const t = getMessages(session.preferredLanguage);
  const [q, setQ] = useState(filters.q ?? "");
  const [showFilters, setShowFilters] = useState(false);

  // Keep local search input in sync with the URL filter (e.g., after navigation).
  useEffect(() => {
    setQ(filters.q ?? "");
  }, [filters.q]);

  // Read live data from the reactive store
  const result = useStoreSelector((state) =>
    getChildrenDirectory(state, session, {
      q: filters.q,
      centerId: filters.centerId,
      status: filters.status ?? "all",
      ageGroup: filters.ageGroup ?? "all",
      sort: filters.sort ?? "name",
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 6,
    }),
  );

  function applyFilters(newFilters: Record<string, string | number>) {
    const params = new URLSearchParams();
    Object.entries({ ...filters, ...newFilters, page: 1 }).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== "" && String(v) !== "all") params.set(k, String(v));
    });
    router.push(`/children?${params.toString()}`);
  }

  function goToPage(page: number) {
    const params = new URLSearchParams();
    Object.entries({ ...filters, page }).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== "" && String(v) !== "all") params.set(k, String(v));
    });
    router.push(`/children?${params.toString()}`);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{session.role === "PARENT" ? "My Children" : "Children Directory"}</h1>
          <p className="text-stone-500 text-sm">{result.total} children found</p>
        </div>
        {session.role !== "PARENT" && (
          <Link href="/children/new" className="btn-primary">
            <Baby className="w-4 h-4" /> Add Child
          </Link>
        )}
      </div>

      {/* Search and filters */}
      <div className="card p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters({ q })}
              placeholder="Search by name or ID…"
              className="input pl-10"
            />
          </div>
          <button onClick={() => setShowFilters((v) => !v)} className="btn-secondary">
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-stone-100">
            <div>
              <label className="label">Center</label>
              <select className="input" value={filters.centerId ?? ""} onChange={(e) => applyFilters({ centerId: e.target.value })}>
                <option value="">All centers</option>
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={filters.status ?? "all"} onChange={(e) => applyFilters({ status: e.target.value })}>
                <option value="all">All</option>
                <option value="follow-up">Follow-up</option>
                <option value="stable">Stable</option>
              </select>
            </div>
            <div>
              <label className="label">Age Group</label>
              <select className="input" value={filters.ageGroup ?? "all"} onChange={(e) => applyFilters({ ageGroup: e.target.value })}>
                <option value="all">All ages</option>
                <option value="0-2">0-2 years</option>
                <option value="2-4">2-4 years</option>
                <option value="4-6">4-6 years</option>
              </select>
            </div>
            <div>
              <label className="label">Sort by</label>
              <select className="input" value={filters.sort ?? "name"} onChange={(e) => applyFilters({ sort: e.target.value })}>
                <option value="name">Name</option>
                <option value="recent">Recent observation</option>
                <option value="age">Age</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Child cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {result.items.map((child) => (
          <Link key={child.id} href={`/children/${child.id}`} className="card p-4 card-hover">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-forest/15 flex items-center justify-center text-forest font-semibold flex-shrink-0">
                {child.fullName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-stone-800 truncate">{child.fullName}</h3>
                  {child.risks.some((r) => r.level === "HIGH") && (
                    <AlertTriangle className="w-4 h-4 text-risk-red flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-stone-500">{child.internalId} • {ageLabel(child.dateOfBirth)}</p>
                <p className="text-xs text-stone-400 mt-0.5 truncate">{child.center?.name ?? "—"}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-stone-500">
                Last obs: {child.latestObservation ? formatDate(child.latestObservation.observedAt, session.preferredLanguage) : "None"}
              </span>
              {child.risks.length > 0 ? (
                <span className="badge bg-amber-light text-amber-700">{child.risks[0].level}</span>
              ) : (
                <span className="badge bg-forest/10 text-forest"><CheckCircle className="w-3 h-3" /> Stable</span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {result.items.length === 0 && (
        <div className="card p-12 text-center">
          <Baby className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500">No children found matching your criteria.</p>
        </div>
      )}

      {/* Pagination */}
      {result.pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => goToPage(result.page - 1)} disabled={result.page <= 1} className="btn-secondary px-3 py-1.5 disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-stone-600">Page {result.page} of {result.pageCount}</span>
          <button onClick={() => goToPage(result.page + 1)} disabled={result.page >= result.pageCount} className="btn-secondary px-3 py-1.5 disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
