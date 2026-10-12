"use client";

import { useState } from "react";
import { Search, UserPlus, Shield, UserCheck, User } from "lucide-react";
import type { SessionUser } from "@/lib/domain";
import { cn } from "@/lib/utils";

export function AdminUsers({ session, users }: { session: SessionUser; users: any[] }) {
  const [q, setQ] = useState("");
  const filtered = users.filter((u) => u.name?.toLowerCase().includes(q.toLowerCase()) || u.email?.toLowerCase().includes(q.toLowerCase()));

  const roleColor: Record<string, string> = {
    WORKER: "bg-forest/10 text-forest",
    PARENT: "bg-blue-100 text-blue-600",
    CENTER_ADMIN: "bg-purple-100 text-purple-600",
    DISTRICT_ADMIN: "bg-amber-light text-amber-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">User Management</h1>
        <button className="btn-primary">
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="input pl-10" />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="text-left px-4 py-3 font-medium">User</th>
              <th className="text-left px-4 py-3 font-medium">Role</th>
              <th className="text-left px-4 py-3 font-medium">Center</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-stone-100 hover:bg-stone-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-forest/15 flex items-center justify-center text-forest text-sm font-semibold">
                      {(u.name ?? "U").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-stone-800">{u.name}</div>
                      <div className="text-xs text-stone-400">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("badge", roleColor[u.role] ?? "bg-stone-100 text-stone-600")}>
                    {u.role?.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-600">{u.centerId ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="badge bg-forest/10 text-forest"><UserCheck className="w-3 h-3" /> Active</span>
                </td>
                <td className="px-4 py-3">
                  <button className="text-stone-400 hover:text-forest text-xs font-medium">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-stone-400">
            <User className="w-10 h-10 mx-auto mb-2" />
            No users found.
          </div>
        )}
      </div>
    </div>
  );
}
