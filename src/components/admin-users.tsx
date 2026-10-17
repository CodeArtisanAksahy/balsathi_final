"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Edit, Search, User, UserPlus } from "lucide-react";
import type { SessionUser } from "@/lib/domain";
import { apiFetch } from "@/lib/fetch";

type Account = { id: string; name: string; email: string; role: string; phone: string; centerIds: string[]; active: boolean };
type CenterOption = { id: string; name: string; active: boolean };
type ChildOption = { id: string; fullName: string; internalId: string };
type SignupRequest = { id: string; name: string; email: string; phone: string; role: string; centerName: string | null; childReference: string | null; relationship: string | null; createdAt: string };

export function AdminUsers({ session, users: initialUsers, centerNames = {}, databaseMode }: { session: SessionUser; users: Account[]; centerNames?: Record<string, string>; databaseMode: boolean }) {
  const [users, setUsers] = useState(initialUsers);
  const [centers, setCenters] = useState<CenterOption[]>([]);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [signupRequests, setSignupRequests] = useState<SignupRequest[]>([]);
  const canManage = session.role === "DISTRICT_ADMIN" || session.role === "CENTER_ADMIN";
  const filtered = useMemo(() => users.filter((user) => {
    const query = q.trim().toLowerCase();
    const matchText = user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query) || user.phone.toLowerCase().includes(query);
    return matchText && (roleFilter === "ALL" || user.role === roleFilter) && (statusFilter === "ALL" || (statusFilter === "ACTIVE" ? user.active : !user.active));
  }), [users, q, roleFilter, statusFilter]);
  const pageSize = 7;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleUsers = filtered.slice((page - 1) * pageSize, page * pageSize);
  const tabs = [{ label: "All Users", role: "ALL" }, { label: "Anganwadi Workers", role: "WORKER" }, { label: "Parents", role: "PARENT" }, { label: "Center Admins", role: "CENTER_ADMIN" }, { label: "District Admins", role: "DISTRICT_ADMIN" }];

  useEffect(() => {
    if (!databaseMode || !canManage) return;
    void apiFetch<SignupRequest[]>("/api/v1/admin/signup-requests").then(setSignupRequests).catch(() => setSignupRequests([]));
  }, [databaseMode, canManage]);

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

  async function markSignupReviewed(request: SignupRequest) {
    setError("");
    try {
      await apiFetch<{ id: string; status: string }>("/api/v1/admin/signup-requests", { method: "PATCH", body: JSON.stringify({ id: request.id }) });
      setSignupRequests((current) => current.filter((item) => item.id !== request.id));
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update signup request."); }
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

  return <div className="mx-auto max-w-7xl space-y-5">
    <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#638062]">Admin Panel</p><h1 className="mt-1 text-2xl font-bold text-stone-800">Users</h1></div><button onClick={openAdd} disabled={!databaseMode || !canManage} className="btn-primary disabled:opacity-50"><UserPlus className="w-4 h-4" /> Add User</button></div>
    {!databaseMode && <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Account provisioning is available only when SQLite persistence is enabled.</div>}
    {error && !showAdd && <div role="alert" className="rounded-xl bg-risk-red-light p-3 text-sm text-risk-red">{error}</div>}
    {databaseMode && canManage && <section className="card p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-forest"/><div><h2 className="font-semibold text-stone-800">Signup requests</h2><p className="text-xs text-stone-500">Verify the details, use Add User to provision the account, then mark the request reviewed.</p></div></div><span className="rounded-full bg-[#edf5e9] px-2.5 py-1 text-xs font-semibold text-forest">{signupRequests.length} pending</span></div>
      {signupRequests.length ? <div className="mt-4 space-y-2">{signupRequests.map((request) => <article key={request.id} className="flex flex-col justify-between gap-3 rounded-xl border border-stone-200 p-3 sm:flex-row sm:items-center"><div><p className="font-medium text-stone-800">{request.name} <span className="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">{request.role === "PARENT" ? "Parent" : "Worker"}</span></p><p className="text-xs text-stone-500">{request.email} · {request.phone}</p><p className="mt-1 text-xs text-stone-500">{request.role === "PARENT" ? `Child: ${request.childReference} · ${request.relationship}` : `Center: ${request.centerName}`}</p></div><div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end"><p className="text-xs text-stone-400">{new Date(request.createdAt).toLocaleDateString()}</p><button type="button" onClick={() => void markSignupReviewed(request)} className="btn-secondary px-3 py-2 text-xs">Mark reviewed</button></div></article>)}</div> : <p className="mt-4 rounded-xl bg-stone-50 p-4 text-center text-sm text-stone-500">No signup requests right now.</p>}
    </section>}
    <div className="flex gap-1 overflow-x-auto border-b border-stone-200">{tabs.map((tab) => <button key={tab.role} onClick={() => { setRoleFilter(tab.role); setPage(1); }} className={`shrink-0 border-b-2 px-3 py-2 text-xs sm:text-sm ${roleFilter === tab.role ? "border-[#4f8a56] bg-[#eff6eb] font-semibold text-[#386d43]" : "border-transparent text-stone-500"}`}>{tab.label}<span className="ml-1 text-[10px] text-stone-400">{tab.role === "ALL" ? users.length : users.filter((user) => user.role === tab.role).length}</span></button>)}</div>
    <div className="flex flex-wrap gap-3"><div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" /><input value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} placeholder="Search by name, phone, or email…" className="input pl-10" /></div><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="input max-w-[180px]"><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div>
    <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-[#faf9f5] text-stone-500"><tr>{["User", "Role", "Mobile / Email", "Center", "Status", "Actions"].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs font-medium">{heading}</th>)}</tr></thead><tbody>{visibleUsers.map((user) => <tr key={user.id} className="border-t border-stone-100"><td className="px-4 py-3"><div className="font-medium text-stone-800">{user.name}</div></td><td className="px-4 py-3">{user.role.replaceAll("_", " ")}</td><td className="px-4 py-3"><div>{user.phone || "—"}</div><div className="text-xs text-stone-400">{user.email}</div></td><td className="px-4 py-3">{user.centerIds?.length ? user.centerIds.map((id) => centerNames[id] ?? id).join(", ") : "—"}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${user.active ? "bg-[#eaf3e8] text-[#386d43]" : "bg-[#fde8e5] text-[#b64037]"}`}>{user.active ? "Active" : "Inactive"}</span></td><td className="px-4 py-3"><button onClick={() => { setError(""); setEditing(user); }} disabled={!databaseMode || !canManage || user.id === session.id} className="rounded p-2 text-stone-600 disabled:opacity-40" title="Edit account"><Edit className="h-4 w-4" /></button><button onClick={() => toggleActive(user)} disabled={!databaseMode || !canManage || user.id === session.id} className="rounded p-2 text-stone-600 disabled:opacity-40" title={user.active ? "Deactivate" : "Activate"}>{user.active ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}</button></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="py-12 text-center text-stone-400"><User className="mx-auto mb-2 h-10 w-10" />No users found.</div>}</div><div className="flex items-center justify-between border-t border-stone-100 px-4 py-3 text-xs text-stone-500"><span>Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} users</span><div className="flex items-center gap-1"><button className="rounded p-1 disabled:opacity-30" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="h-4 w-4"/></button><span className="rounded bg-[#eff6eb] px-2 py-1 text-[#386d43]">{page}</span><button className="rounded p-1 disabled:opacity-30" aria-label="Next page" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><ChevronRight className="h-4 w-4"/></button></div></div></div>
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
