import { Database, Lock, Shield, Users } from "lucide-react";
import { getSession } from "@/lib/auth";
import { config } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export default async function AdminPrivacyPage() {
  const session = await getSession();
  if (!session) return null;
  const children = config.dataMode === "sqlite" ? await prisma.child.findMany({
    where: { active: true, ...(session.role === "DISTRICT_ADMIN" ? {} : { centerId: { in: session.centerIds } }) },
    select: { consentStatus: true },
  }) : [];
  const consentCounts = {
    approved: children.filter((child) => child.consentStatus === "APPROVED").length,
    pending: children.filter((child) => child.consentStatus === "PENDING").length,
    other: children.filter((child) => !["APPROVED", "PENDING"].includes(child.consentStatus)).length,
  };
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center"><Shield className="w-4 h-4 text-rose-600" /></div>
        <h1 className="text-2xl font-bold text-stone-800">Privacy &amp; Data Protection</h1>
      </div>
      <div role="status" className="card p-5 space-y-2">
        <h2 className="font-semibold text-stone-800">Policy controls are not managed in this application</h2>
        <p className="text-sm text-stone-600">Retention, consent enforcement, export/deletion policy, and transport encryption depend on deployment configuration and operational procedures. The previous switches were local-only and did not change application behavior.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <article className="card p-4"><Users className="w-7 h-7 text-forest mb-2" /><h2 className="font-semibold text-stone-800">Access scope</h2><p className="mt-1 text-sm text-stone-500">Child records are scoped by role, center assignments, and linked guardian records on supported SQLite routes.</p></article>
        <article className="card p-4"><Database className="w-7 h-7 text-blue-600 mb-2" /><h2 className="font-semibold text-stone-800">Retention</h2><p className="mt-1 text-sm text-stone-500">No automatic retention schedule or deletion workflow is configured.</p></article>
        <article className="card p-4"><Lock className="w-7 h-7 text-amber-600 mb-2" /><h2 className="font-semibold text-stone-800">Transport security</h2><p className="mt-1 text-sm text-stone-500">Use HTTPS at the deployment edge. Local development HTTP does not provide transport encryption.</p></article>
      </div>
      <section className="card p-5" aria-labelledby="consent-status-heading">
        <h2 id="consent-status-heading" className="font-semibold text-stone-800 mb-4">Consent status for active children in scope</h2>
        {config.dataMode === "sqlite" ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ConsentCount value={consentCounts.approved} label="Approved" />
          <ConsentCount value={consentCounts.pending} label="Pending" />
          <ConsentCount value={consentCounts.other} label="Other status" />
          <ConsentCount value={children.length} label="Total" />
        </div> : <p className="text-sm text-stone-500">Consent counts are unavailable in demo mode.</p>}
      </section>
    </div>
  );
}

function ConsentCount({ value, label }: { value: number; label: string }) {
  return <div className="text-center p-3 rounded-xl bg-stone-50"><div className="text-2xl font-bold text-stone-800">{value}</div><div className="text-xs text-stone-500 mt-1">{label}</div></div>;
}
