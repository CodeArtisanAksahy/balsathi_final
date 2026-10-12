"use client";

import { useState } from "react";
import { HelpCircle, MessageSquare, ChevronDown, ChevronUp, BookOpen, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  { q: "How do I record a new observation?", a: "Go to the dashboard and click 'Add Observation', then select the child, domain, and fill in the observation details." },
  { q: "What does 'At Risk' mean?", a: "'At Risk' indicates that a child may need additional assessment based on recorded observations. This is not a diagnosis — it flags areas for follow-up." },
  { q: "How do I switch languages?", a: "Use the language selector in the top right header. Your preference is saved automatically." },
  { q: "Can I use the app offline?", a: "Yes. Observations recorded offline are saved locally and automatically synced when you reconnect. Check the Offline page for sync status." },
  { q: "How does the AI Assistant work?", a: "The AI Assistant answers questions about children you are authorized to access. It retrieves actual records from the database — it never fabricates data." },
  { q: "Who can see a child's information?", a: "Only authorized workers assigned to the child's center, the child's parent/guardian, and approved administrators. Access is strictly controlled." },
];

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">Help & Support</h1>

      {/* Quick help cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickCard icon={BookOpen} title="User Guide" desc="Learn how to use all features" />
        <QuickCard icon={MessageSquare} title="Contact Support" desc="Reach the helpdesk" />
        <QuickCard icon={Phone} title="Helpline" desc="Call 1800-XXX-XXXX" />
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
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-stone-800 mb-4">Contact Support</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Subject</label>
            <input className="input" placeholder="Briefly describe your issue" />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea className="input min-h-[100px] resize-y" placeholder="Provide details..." />
          </div>
          <button className="btn-primary">Send Message</button>
        </div>
      </div>
    </div>
  );
}

function QuickCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
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
