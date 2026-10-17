"use client";

import { ScrollText } from "lucide-react";
import type { SessionUser, AuditLog } from "@/lib/domain";
import { formatDateTime } from "@/lib/utils";

export function AuditLogs({ session, logs }: { session: SessionUser; logs: AuditLog[] }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">Audit Logs</h1>
      <p className="text-sm text-stone-500">All system actions are logged for security and compliance.</p>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Time</th>
              <th className="text-left px-4 py-3 font-medium">Actor</th>
              <th className="text-left px-4 py-3 font-medium">Action</th>
              <th className="text-left px-4 py-3 font-medium">Entity</th>
              <th className="text-left px-4 py-3 font-medium">Scope</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-stone-100 hover:bg-stone-50">
                <td className="px-4 py-3 text-stone-500 whitespace-nowrap text-xs">
                  {formatDateTime(log.createdAt, session.preferredLanguage)}
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-stone-700">{log.actorId ?? "system"}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="badge bg-forest/10 text-forest capitalize">{log.action.replace(/_/g, " ")}</span>
                </td>
                <td className="px-4 py-3 text-stone-600">{log.entityType}: {log.entityId}</td>
                <td className="px-4 py-3 text-stone-400 text-xs">{log.scopeCenterId ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="text-center py-12 text-stone-400">
            <ScrollText className="w-10 h-10 mx-auto mb-2" />
            No audit logs found.
          </div>
        )}
      </div>
    </div>
  );
}
