"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, MessageCircle } from "lucide-react";
import type { Message, SessionUser } from "@/lib/domain";
import { formatDateTime } from "@/lib/utils";
import { useStoreSelector } from "@/hooks/use-store";
import { getAuthorizedChildren, getChildMessages } from "@/lib/selectors";
import { storeActions } from "@/lib/store-actions";
import { toast } from "sonner";
import { apiFetch, getConfiguredDataMode } from "@/lib/fetch";

export function MessagesView({
  session,
  selectedChildId,
}: {
  session: SessionUser;
  selectedChildId?: string;
}) {
  const router = useRouter();
  const children = useStoreSelector((state) => getAuthorizedChildren(state, session));
  const childId = selectedChildId && children.some((child) => child.id === selectedChildId)
    ? selectedChildId
    : children[0]?.id ?? "";
  const messages = useStoreSelector((state) =>
    childId ? getChildMessages(state, childId) : [],
  );

  const [databaseMode, setDatabaseMode] = useState(false);
  const [databaseMessages, setDatabaseMessages] = useState<Message[]>([]);
  const [loadError, setLoadError] = useState("");
  const visibleMessages = databaseMode ? databaseMessages : messages;

  const refreshMessages = useCallback(async () => {
    if (!childId) return;
    try {
      if (await getConfiguredDataMode() !== "sqlite") { setDatabaseMode(false); return; }
      setDatabaseMode(true);
      const result = await apiFetch<Message[]>(`/api/messages?childId=${encodeURIComponent(childId)}`);
      setDatabaseMessages(result);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Messages could not be loaded.");
    }
  }, [childId]);

  useEffect(() => {
    setDatabaseMessages([]);
    setLoadError("");
    void refreshMessages();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refreshMessages(); }, 10_000);
    const onFocus = () => void refreshMessages();
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [refreshMessages]);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (childId) {
      router.push(`/messages?childId=${childId}`);
    }
  }, [childId, router]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleMessages.length]);

  async function send() {
    if (!text.trim() || !childId) return;
    setSending(true);
    try {
      const input = {
        childId,
        locale: session.preferredLanguage,
        subject: "Message",
        body: text,
      };
      if (await getConfiguredDataMode() === "sqlite") {
        const created = await apiFetch<Message>("/api/messages", { method: "POST", body: JSON.stringify(input) });
        setDatabaseMode(true);
        setDatabaseMessages((current) => [...current.filter((message) => message.id !== created.id), created].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      } else storeActions.addMessage(session, input);
      setText("");
    } catch {
      toast.error("Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  const selectedChild = children.find((c) => c.id === childId);

  return (
    <div className="h-[calc(100vh-220px)] flex gap-4">
      {/* Child list */}
      <div className="w-64 card p-3 flex-shrink-0 overflow-y-auto">
        <h3 className="font-semibold text-stone-700 text-sm mb-2 px-1">Conversations</h3>
        <div className="space-y-1">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/messages?childId=${c.id}`)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                childId === c.id ? "bg-forest/10 text-forest font-medium" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {c.fullName}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 card flex flex-col overflow-hidden">
        {childId ? (
          <>
            <div className="border-b border-stone-100 p-4">
              <h3 className="font-semibold text-stone-800">{selectedChild?.fullName}</h3>
              <p className="text-xs text-stone-500">{session.role === "PARENT" ? "Anganwadi Worker" : "Parent / Guardian"}</p>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loadError}</p>}
              {visibleMessages.length === 0 && !loadError && (
                <div className="text-center text-stone-400 mt-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No messages yet. Start the conversation.</p>
                </div>
              )}
              {visibleMessages.map((m) => {
                const isMine = m.direction === (session.role === "PARENT" ? "PARENT_TO_WORKER" : "WORKER_TO_PARENT");
                return (
                  <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMine ? "bg-forest text-white rounded-br-md" : "bg-stone-100 text-stone-800 rounded-bl-md"}`}>
                      <p className="text-sm">{m.body}</p>
                      <p className={`text-[10px] mt-1 ${isMine ? "text-forest-light" : "text-stone-400"}`}>
                        {formatDateTime(m.createdAt, session.preferredLanguage)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-stone-100 p-3 flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type a message…"
                className="input flex-1"
              />
              <button onClick={send} disabled={sending || !text.trim()} className="btn-primary px-4">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-stone-400">
            Select a child to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
