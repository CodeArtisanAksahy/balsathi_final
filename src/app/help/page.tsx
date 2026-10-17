"use client";

import { useState } from "react";
import Link from "next/link";
import { HelpCircle, MessageSquare, ChevronDown, ChevronUp, BookOpen, Phone, HeartPulse, MessageCircle, ShieldAlert } from "lucide-react";

const faqs = [
  { q: "How do I record a new observation?", a: "Go to the dashboard and click 'Add Observation', then select the child, domain, and fill in the observation details." },
  { q: "What does 'At Risk' mean?", a: "'At Risk' indicates that a child may need additional assessment based on recorded observations. This is not a diagnosis — it flags areas for follow-up." },
  { q: "How do I switch languages?", a: "Use the language selector in the top right header. Your preference is saved automatically." },
  { q: "Can I use the app offline?", a: "Automatic offline capture and synchronization are unavailable. The Offline page can show locally queued items, but they are not uploaded when you reconnect. Save observations while connected and confirm the server response." },
  { q: "How does the AI Assistant work?", a: "The AI Assistant answers questions about children you are authorized to access. It retrieves actual records from the database — it never fabricates data." },
  { q: "Who can see a child's information?", a: "Only authorized workers assigned to the child's center, the child's parent/guardian, and approved administrators. Access is strictly controlled." },
];

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <section className="rounded-3xl bg-[#eff6eb] p-5"><h1 className="text-xl font-bold text-stone-800">Help &amp; Support</h1><p className="mt-1 text-sm text-stone-600">We’re here to help you.</p><div className="mt-4 grid grid-cols-2 gap-3"><Link href="/messages" className="flex items-center gap-2 rounded-2xl bg-white p-3 text-sm font-medium text-stone-700"><MessageCircle className="h-5 w-5 text-[#386d43]"/>Talk to worker</Link><Link href="/parent/health" className="flex items-center gap-2 rounded-2xl bg-white p-3 text-sm font-medium text-stone-700"><HeartPulse className="h-5 w-5 text-[#386d43]"/>Health guidance</Link></div></section>

      {/* Quick help cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickCard icon={BookOpen} title="FAQs" desc="Answers to common questions" />
        <Link href="/messages"><QuickCard icon={MessageSquare} title="Talk to Worker" desc="Send a message to your Anganwadi worker" /></Link>
        <QuickCard icon={Phone} title="Call Support" desc="A support phone number is not configured" />
      </div>

      {/* FAQ */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-stone-800 mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-forest" /> Frequently Asked Questions
        </h2>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-stone-100 last:border-0">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between py-3 text-left"
              >
                <span className="font-medium text-stone-700 pr-4">{faq.q}</span>
                {open === i ? <ChevronUp className="w-4 h-4 text-stone-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0" />}
              </button>
              {open === i && (
                <p className="text-sm text-stone-600 pb-3">{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Support form */}
      <div role="status" className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><ShieldAlert className="h-5 w-5 shrink-0"/><p>Phone support and emergency contact numbers are not configured for this deployment. For an emergency, contact your local emergency service.</p></div>
    </div>
  );
}

function QuickCard({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="card p-5 hover:shadow-md transition">
      <div className="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-forest" />
      </div>
      <h3 className="font-semibold text-stone-800">{title}</h3>
      <p className="text-sm text-stone-500 mt-1">{desc}</p>
    </div>
  );
}
