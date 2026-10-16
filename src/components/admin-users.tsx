"use client";

import { useMemo, useState } from "react";
import { Ban, CheckCircle2, Edit, Search, User, UserPlus } from "lucide-react";
import type { SessionUser } from "@/lib/domain";
import { apiFetch } from "@/lib/fetch";

type Account = { id: string; name: string; email: string; role: string; phone: string; centerIds: string[]; active: boolean };
type CenterOption = { id: string; name: string; active: boolean };
type ChildOption = { id: string; fullName: string; internalId: string };

export function AdminUsers({ session, users: initialUsers, databaseMode }: { session: SessionUser; users: Account[]; databaseMode: boolean }) {
  const [users, setUsers] = useState(initialUsers);
  const [centers, setCenters] = useState<CenterOption[]>([]);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const canManage = session.role === "DISTRICT_ADMIN" || session.role === "CENTER_ADMIN";
  const filtered = useMemo(() => users.filter((user) => {
    const matchText = user.name.toLowerCase().includes(q.toLowerCase()) || user.email.toLowerCase().includes(q.toLowerCase());
    return matchText && (roleFilter === "ALL" || user.role === roleFilter) && (statusFilter === "ALL" || (statusFilter === "ACTIVE" ? user.active : !user.active));
  }), [users, q, roleFilter, statusFilter]);

  async function openAdd() {
    setError(""); setShowAdd(true);
    try {
      const [centerRows, childRows] = await Promise.all([
        apiFetch<CenterOption[]>("/api/v1/admin/centers"),
        apiFetch<{ items: ChildOption[] }>("/api/v1/children?pageSize=100"),
      ]);
      setCenters(centerRows.filter((center) => center.active));
      setChildren(childRows.items);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load centers and children."); }
  }

  async function toggleActive(user: Account) {
    setError("");
    try {
      const updated = await apiFetch<Account>(`/api/v1/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ active: !user.active }) });
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, ...updated } : item));
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update account."); }
  }

  async function createAccount(formData: FormData) {
    setSaving(true); setError("");
    try {
      const role = String(formData.get("role"));
      const centerIds = formData.getAll("centerIds").map(String);
      const links = formData.getAll("childLinks").map((value) => JSON.parse(String(value)) as { childId: string; relationship: string });
      const created = await apiFetch<Account>("/api/v1/admin/users", { method: "POST", body: JSON.stringify({
        name: formData.get("name"), email: formData.get("email"), phone: formData.get("phone"), password: formData.get("password"), role,
        preferredLanguage: formData.get("preferredLanguage"), centerIds, ...(role === "PARENT" ? { guardianLinks: links } : {}),
      }) });
      setUsers((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAdd(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create account."); }
    finally { setSaving(false); }
  }

  async function updateAccount(formData: FormData) {
    if (!editing) return;
    setSaving(true); setError("");
    try {
      const payload = { name: formData.get("name"), phone: formData.get("phone"), ...(formData.get("password") ? { password: formData.get("password") } : {}) };
      const updated = await apiFetch<Account>(`/api/v1/admin/users/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      setUsers((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
      setEditing(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update account."); }
    finally { setSaving(false); }
  }

  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-bold text-stone-800">User Management</h1><button onClick={openAdd} disabled={!databaseMode || !canManage} className="btn-primary disabled:opacity-50"><UserPlus className="w-4 h-4" /> Add User</button></div>
    {!databaseMode && <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Account provisioning is available only when SQLite persistence is enabled.</div>}
    {error && !showAdd && <div role="alert" className="rounded-xl bg-risk-red-light p-3 text-sm text-risk-red">{error}</div>}
    <div className="flex flex-wrap gap-3"><div className="relative min-w-[200px] flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" /><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search users…" className="input pl-10" /></div><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="input max-w-[190px]"><option value="ALL">All roles</option>{["WORKER", "PARENT", "CENTER_ADMIN", "DISTRICT_ADMIN"].map((role) => <option key={role}>{role}</option>)}</select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="input max-w-[160px]"><option value="ALL">All status</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div>
    <div className="card overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead className="bg-stone-50 text-stone-500"><tr>{["User", "Role", "Center", "Status", "Actions"].map((heading) => <th key={heading} className="px-4 py-3 text-left font-medium">{heading}</th>)}</tr></thead><tbody>{filtered.map((user) => <tr key={user.id} className="border-t border-stone-100"><td className="px-4 py-3"><div className="font-medium text-stone-800">{user.name}</div><div className="text-xs text-stone-400">{user.email}</div></td><td className="px-4 py-3">{user.role.replaceAll("_", " ")}</td><td className="px-4 py-3">{user.centerIds?.length ? user.centerIds.join(", ") : "—"}</td><td className="px-4 py-3">{user.active ? "Active" : "Inactive"}</td><td className="px-4 py-3"><button onClick={() => { setError(""); setEditing(user); }} disabled={!databaseMode || !canManage || user.id === session.id} className="rounded p-2 text-stone-600 disabled:opacity-40" title="Edit account"><Edit className="h-4 w-4" /></button><button onClick={() => toggleActive(user)} disabled={!databaseMode || !canManage || user.id === session.id} className="rounded p-2 text-stone-600 disabled:opacity-40" title={user.active ? "Deactivate" : "Activate"}>{user.active ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}</button></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="py-12 text-center text-stone-400"><User className="mx-auto mb-2 h-10 w-10" />No users found.</div>}</div>
    {showAdd && <UserCreateDialog centers={centers} children={children} canCreateCenterAdmin={session.role === "DISTRICT_ADMIN"} saving={saving} error={error} onClose={() => setShowAdd(false)} onSubmit={createAccount} />}
    {editing && <UserEditDialog user={editing} saving={saving} error={error} onClose={() => setEditing(null)} onSubmit={updateAccount} />}
  </div>;
}

function UserEditDialog({ user, saving, error, onClose, onSubmit }: { user: Account; saving: boolean; error: string; onClose: () => void; onSubmit: (data: FormData) => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form action={onSubmit} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl"><h2 className="text-lg font-bold">Edit account</h2>{error && <div role="alert" className="rounded-lg bg-risk-red-light p-3 text-sm text-risk-red">{error}</div>}<label className="block text-sm">Name<input name="name" defaultValue={user.name} required minLength={2} className="input mt-1" /></label><label className="block text-sm">Phone<input name="phone" defaultValue={user.phone} required minLength={7} className="input mt-1" /></label><label className="block text-sm">Set a new password (optional, 12+ characters)<input name="password" type="password" minLength={12} autoComplete="new-password" className="input mt-1" /></label><p className="text-xs text-stone-500">Changing the password revokes all active sessions for this account.</p><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button disabled={saving} className="btn-primary disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button></div></form></div>;
}

function UserCreateDialog({ centers, children, canCreateCenterAdmin, saving, error, onClose, onSubmit }: { centers: CenterOption[]; children: ChildOption[]; canCreateCenterAdmin: boolean; saving: boolean; error: string; onClose: () => void; onSubmit: (data: FormData) => void }) {
  const [role, setRole] = useState("WORKER");
  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form action={onSubmit} className="my-8 max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
    <h2 className="text-lg font-bold">Create account</h2>
    {error && <div role="alert" className="rounded-lg bg-risk-red-light p-3 text-sm text-risk-red">{error}</div>}
    <label className="block text-sm">Full name<input name="name" required minLength={2} maxLength={120} className="input mt-1" /></label>
    <label className="block text-sm">Email<input name="email" type="email" required className="input mt-1" /></label>
    <label className="block text-sm">Phone<input name="phone" type="tel" required minLength={7} maxLength={20} className="input mt-1" /></label>
    <label className="block text-sm">Initial password (12+ characters)<input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" className="input mt-1" /></label>
    <p className="-mt-2 text-xs text-stone-500">No default credentials are created. Deliver the initial password to the account holder through your approved secure process.</p>
    <label className="block text-sm">Role<select name="role" value={role} onChange={(event) => setRole(event.target.value)} className="input mt-1"><option value="WORKER">Worker</option><option value="PARENT">Parent</option>{canCreateCenterAdmin && <option value="CENTER_ADMIN">Center administrator</option>}</select></label>
    <label className="block text-sm">Preferred language<select name="preferredLanguage" className="input mt-1"><option value="en">English</option><option value="hi">Hindi</option><option value="mr">Marathi</option></select></label>
    {role !== "PARENT" ? <fieldset><legend className="mb-2 text-sm font-medium">Assigned centers</legend>{centers.length ? centers.map((center) => <label key={center.id} className="mr-4 inline-flex items-center gap-2 text-sm"><input type="checkbox" name="centerIds" value={center.id} />{center.name}</label>) : <p className="text-sm text-stone-500">No active centers available.</p>}</fieldset> : <fieldset><legend className="mb-1 text-sm font-medium">Link to verified child guardian records</legend><p className="mb-2 text-xs text-stone-500">The account name, phone, and relationship must match an unlinked guardian record for each selected child.</p><div className="max-h-48 space-y-2 overflow-y-auto">{children.map((child) => <label key={child.id} className="flex items-center justify-between gap-2 rounded border border-stone-100 p-2 text-sm"><span><input type="checkbox" name="childLinks" value={JSON.stringify({ childId: child.id, relationship: "MOTHER" })} className="mr-2" />{child.fullName} ({child.internalId})</span><select aria-label={`Relationship for ${child.fullName}`} className="input max-w-[150px]" onChange={(event) => { const checkbox = event.currentTarget.closest("label")?.querySelector<HTMLInputElement>("input[name=childLinks]"); if (checkbox?.checked) checkbox.value = JSON.stringify({ childId: child.id, relationship: event.target.value }); }}><option value="MOTHER">Mother</option><option value="FATHER">Father</option><option value="GRANDPARENT">Grandparent</option><option value="SIBLING">Sibling</option><option value="OTHER">Other</option></select></label>)}</div></fieldset>}
    <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button disabled={saving} className="btn-primary disabled:opacity-50">{saving ? "Creating…" : "Create account"}</button></div>
  </form></div>;
}
