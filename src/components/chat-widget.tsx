"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Sparkles, Loader2 } from "lucide-react";
import type { SessionUser } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { processChat } from "@/lib/chat-service";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
};

const suggestedQuestions = [
  { en: "Summarize my child's latest progress", hi: "मेरे बच्चे की नवीनतम प्रगति का सारांश दें", mr: "माझ्या मुलाच्या अलीकडील प्रगतीचा सारांश द्या" },
  { en: "Which milestones are completed?", hi: "कौन से माइलस्टोन पूरे हुए हैं?", mr: "कोणते टप्पे पूर्ण झाले आहेत?" },
  { en: "What follow-up actions are pending?", hi: "कौन सी फॉलो-अप क्रियाएं बाकी हैं?", mr: "कोणत्या फॉलो-अप क्रिया पENDING आहेत?" },
  { en: "Suggest home activities", hi: "घरेलू गतिविधियाँ सुझाएं", mr: "घरगुती उपक्रम सुचवा" },
];

export function ChatWidget({ session, defaultOpen = false }: { session: SessionUser; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        session.role === "PARENT"
          ? "Namaste! I'm your Balsathi AI Assistant. I can explain your child's recorded progress, milestones, and suggest home activities. How can I help?"
          : "Namaste! I'm the Balsathi AI Assistant. I can summarize child observations, milestone status, and follow-up actions using authorized records. Ask me anything about the children in your scope.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [childId, setChildId] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const locale = session.preferredLanguage;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: question };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      // Read directly from the reactive client store so answers always reflect
      // the latest records without a server round-trip.
      const result = processChat(session, locale, question, childId || undefined);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: result.answer, sources: result.sources },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, I couldn't process that request." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-forest text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105",
          open && "hidden",
        )}
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-cream" />
      </button>

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[calc(100vw-3rem)] sm:w-96 h-[70vh] max-h-[600px] bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-forest text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <div>
                <div className="font-semibold text-sm">Balsathi AI Assistant</div>
                <div className="text-[10px] text-forest-light opacity-90">Record-grounded answers</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/20">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-forest text-white rounded-br-md"
                      : "bg-white border border-stone-200 text-stone-700 rounded-bl-md",
                  )}
                >
                  {msg.content}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-stone-100 text-[10px] text-stone-400">
                      Sources: {msg.sources.join(", ")}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-stone-200 rounded-2xl px-3.5 py-2.5 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-forest" />
                  <span className="text-sm text-stone-500">Analyzing records…</span>
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="px-4 pb-2 space-y-1.5">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => send(q[locale] ?? q.en)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-forest/5 text-forest hover:bg-forest/10 transition"
                >
                  {q[locale] ?? q.en}
                </button>
              ))}
            </div>
          )}

          <div className="p-3 border-t border-stone-200 bg-white">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder="Ask about a child's progress…"
                className="input flex-1 text-sm"
              />
              <button onClick={() => send(input)} disabled={loading || !input.trim()} className="btn-primary px-3">
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-stone-400 mt-1.5 text-center">
              Answers are based on authorized records, not medical diagnosis.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
