"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, MessageCircle } from "lucide-react";
import type { SessionUser } from "@/lib/domain";
import { formatDateTime } from "@/lib/utils";
import { useStoreSelector } from "@/hooks/use-store";
import { getAuthorizedChildren, getChildMessages } from "@/lib/selectors";
import { storeActions } from "@/lib/store-actions";
import { toast } from "sonner";

export function MessagesView({
  session,
  selectedChildId,
}: {
  session: SessionUser;
  selectedChildId?: string;
}) {
  const router = useRouter();
  const children = useStoreSelector((state) => getAuthorizedChildren(state, session));
  const childId = selectedChildId ?? children[0]?.id ?? "";
  const messages = useStoreSelector((state) =>
    childId ? getChildMessages(state, childId) : [],
  );

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
  }, [messages.length]);

  function send() {
    if (!text.trim() || !childId) return;
    setSending(true);
    try {
      storeActions.addMessage(session, {
        childId,
        locale: session.preferredLanguage,
        subject: "Message",
        body: text,
      });
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
              {messages.length === 0 && (
                <div className="text-center text-stone-400 mt-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No messages yet. Start the conversation.</p>
                </div>
              )}
              {messages.map((m) => {
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
