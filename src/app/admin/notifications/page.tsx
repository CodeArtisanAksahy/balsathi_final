import { Bell, Mail, MessageSquare } from "lucide-react";

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center"><Bell className="w-4 h-4 text-amber-600" /></div>
        <h1 className="text-2xl font-bold text-stone-800">Notifications</h1>
      </div>
      <div role="status" className="card p-6 space-y-3">
        <h2 className="font-semibold text-stone-800">Notification delivery is unavailable</h2>
        <p className="text-sm text-stone-600">No notification delivery provider or persisted preference store is configured. This page does not show recent alerts or report that settings were saved.</p>
        <div className="flex flex-wrap gap-2 text-xs text-stone-500"><span className="badge bg-stone-100"><Mail className="mr-1 h-3 w-3" />Email unavailable</span><span className="badge bg-stone-100"><MessageSquare className="mr-1 h-3 w-3" />In-app alerts unavailable</span></div>
      </div>
    </div>
  );
}
