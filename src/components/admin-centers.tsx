"use client";

import { Building2, MapPin, Users, Plus } from "lucide-react";
import type { SessionUser, Center } from "@/lib/domain";

export function AdminCenters({ session, centers }: { session: SessionUser; centers: Center[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Anganwadi Centers</h1>
        <button className="btn-primary">
          <Plus className="w-4 h-4" /> Add Center
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {centers.map((c) => (
          <div key={c.id} className="card p-5 hover:shadow-md transition">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-forest/15 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-forest" />
              </div>
              <span className="badge bg-forest/10 text-forest">Active</span>
            </div>
            <h3 className="font-semibold text-stone-800 mt-3">{c.name}</h3>
            <p className="text-sm text-stone-500 mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {c.village}, {c.district}
            </p>
            {c.state && <p className="text-xs text-stone-400 mt-1">{c.state}</p>}
            <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-500 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {c.id}
              </span>
              <button className="text-sm text-forest font-medium">Manage →</button>
            </div>
          </div>
        ))}
      </div>

      {centers.length === 0 && (
        <div className="card p-12 text-center">
          <Building2 className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500">No centers found.</p>
        </div>
      )}
    </div>
  );
}
