"use client";

import { useState } from "react";
import {
  Search, UserPlus, Shield, UserCheck, User, Edit, Ban, CheckCircle2,
} from "lucide-react";
import type { SessionUser } from "@/lib/domain";
import { cn } from "@/lib/utils";

type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  centerId?: string;
  active: boolean;
};

export function AdminUsers({ session, users: initialUsers }: { session: SessionUser; users: any[] }) {
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [users, setUsers] = useState<DemoUser[]>(
    initialUsers.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, centerId: u.centerId, active: u.active ?? true })),
  );
  const [showAdd, setShowAdd] = useState(false);

  const filtered = users.filter((u) => {
    const matchesQ = u.name?.toLowerCase().includes(q.toLowerCase()) || u.email?.toLowerCase().includes(q.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchesStatus = statusFilter === "ALL" || (statusFilter === "ACTIVE" ? u.active : !u.active);
    return matchesQ && matchesRole && matchesStatus;
  });

  function toggleActive(id: string) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active: !u.active } : u)));
  }

  const roleColor: Record<string, string> = {
    WORKER: "bg-forest/10 text-forest",
    PARENT: "bg-blue-100 text-blue-600",
    CENTER_ADMIN: "bg-purple-100 text-purple-600",
    DISTRICT_ADMIN: "bg-amber-light text-amber-700",
  };

  const roles = ["ALL", "WORKER", "PARENT", "CENTER_ADMIN", "DISTRICT_ADMIN"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-stone-800">User Management</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="input pl-10" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input max-w-[180px]">
          {roles.map((r) => (
            <option key={r} value={r}>{r === "ALL" ? "All Roles" : r.replace("_", " ")}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input max-w-[160px]">
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
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
                  <span className={cn("badge", u.active ? "bg-forest/10 text-forest" : "bg-stone-100 text-stone-500")}>
                    {u.active ? <><CheckCircle2 className="w-3 h-3" /> Active</> : <>Inactive</>}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500" title="Edit">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleActive(u.id)}
                      className={cn("p-1.5 rounded-lg hover:bg-rose-50", u.active ? "text-rose-500" : "text-forest")}
                      title={u.active ? "Deactivate" : "Activate"}
                    >
                      {u.active ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  </div>
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

      {/* Add User Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-stone-800 mb-4">Add New User</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-stone-700 mb-1 block">Full Name</label>
                <input className="input" placeholder="Enter name" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 mb-1 block">Email</label>
                <input type="email" className="input" placeholder="email@example.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-stone-700 mb-1 block">Role</label>
                  <select className="input">
                    <option value="WORKER">Worker</option>
                    <option value="PARENT">Parent</option>
                    <option value="CENTER_ADMIN">Center Admin</option>
                    <option value="DISTRICT_ADMIN">District Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-700 mb-1 block">Center</label>
                  <select className="input">
                    <option>center-1</option>
                    <option>center-2</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => setShowAdd(false)} className="btn-primary">Add User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
