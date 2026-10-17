"use client";

import { useState } from "react";
import { Apple, HeartPulse, HandHeart, ShieldAlert, ChevronRight } from "lucide-react";

const content = {
  Nutrition: [
    { title: "Iron-rich foods", body: "Include iron-containing foods such as lentils, beans, leafy greens, and fortified cereals as part of a varied diet." },
    { title: "Healthy weight for age", body: "Growth should be reviewed using a child’s age-specific growth chart by a qualified health worker." },
    { title: "Immunity- supporting foods", body: "Offer a variety of fruits, vegetables, pulses, and other age-appropriate foods. No single food prevents illness." },
    { title: "Daily routine tips", body: "Regular meals, active play, sleep, and responsive care support a healthy daily rhythm." },
  ],
  Health: [
    { title: "Routine check-ups", body: "Keep scheduled well-child visits and discuss growth, development, and any concerns with a health professional." },
    { title: "Vaccination records", body: "Follow the vaccination schedule provided by your local health service and keep the child’s record updated." },
    { title: "When to seek care", body: "For concerning symptoms or urgent changes in your child’s health, contact a qualified health provider promptly." },
  ],
  Care: [
    { title: "Responsive play", body: "Follow your child’s interests, talk together, and offer safe play materials suited to their age." },
    { title: "Rest and routine", body: "A predictable, calming bedtime routine can help children settle and get adequate rest." },
    { title: "Safe home", body: "Keep medicines, cleaning products, small objects, and hot items out of children’s reach." },
  ],
};
const icon = { Nutrition: Apple, Health: HeartPulse, Care: HandHeart };

export default function ParentHealthPage() {
  const [tab, setTab] = useState<keyof typeof content>("Nutrition");
  const Icon = icon[tab];
  return <div className="mx-auto max-w-2xl space-y-4 pb-6">
    <header><h1 className="text-xl font-bold text-stone-800">Health &amp; Nutrition</h1><p className="mt-1 text-sm text-stone-500">General guidance for your family</p></header>
    <nav aria-label="Health topics" className="grid grid-cols-3 rounded-2xl bg-[#f0eee8] p-1">{(Object.keys(content) as (keyof typeof content)[]).map((key) => <button key={key} onClick={() => setTab(key)} className={`rounded-xl px-3 py-2 text-sm ${tab === key ? "bg-[#eaf3e8] font-semibold text-[#386d43]" : "text-stone-600"}`}>{key}</button>)}</nav>
    <section className="rounded-3xl bg-[#eff5e9] p-5"><div className="flex items-center gap-2 text-[#386d43]"><Icon className="h-5 w-5"/><h2 className="font-semibold">{tab} guidance</h2></div><p className="mt-2 text-sm text-stone-600">Simple, general ideas to support your child’s wellbeing.</p></section>
    <div className="space-y-3">{content[tab].map((item) => <details key={item.title} className="card group"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4"><span className="font-medium text-stone-800">{item.title}</span><ChevronRight className="h-5 w-5 text-stone-400 transition group-open:rotate-90"/></summary><p className="border-t border-stone-100 px-4 py-3 text-sm text-stone-600">{item.body}</p></details>)}</div>
    <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><ShieldAlert className="h-5 w-5 shrink-0"/><p>This is general educational information, not individualized medical advice. Consult a pediatrician or qualified health worker for child-specific guidance.</p></div>
  </div>;
}
