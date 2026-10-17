"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, BookOpen, Blocks, ChevronRight, Handshake, Lightbulb, MessageCircle, PersonStanding } from "lucide-react";
import type { DevelopmentDomain, SessionUser } from "@/lib/domain";
import { cn, ageLabel } from "@/lib/utils";
import { domainLabel } from "@/lib/i18n";
import { useStoreSelector } from "@/hooks/use-store";
import { getAuthorizedChildren, getChildRecommendations } from "@/lib/selectors";

const ideas: Array<{ title: string; description: string; domain: DevelopmentDomain; icon: typeof BookOpen; tone: string }> = [
  { title: "Picture Talk", description: "Look at pictures together and invite your child to tell you what they see.", domain: "LANGUAGE", icon: BookOpen, tone: "bg-[#fff0df] text-[#a86120]" },
  { title: "Block Building", description: "Build towers together, count the blocks, and take turns adding one.", domain: "COGNITIVE", icon: Blocks, tone: "bg-[#f0e9fa] text-[#8256b1]" },
  { title: "Action Game", description: "Try simple actions together, like clapping, jumping, or walking in place.", domain: "PHYSICAL", icon: PersonStanding, tone: "bg-[#e8f1e6] text-[#426c46]" },
  { title: "Sharing Time", description: "Take turns with a favorite toy and talk about whose turn comes next.", domain: "SOCIAL", icon: Handshake, tone: "bg-[#e6f2f8] text-[#347ea6]" },
  { title: "Feelings in Stories", description: "Name how a character might feel and ask what could help them.", domain: "EMOTIONAL", icon: MessageCircle, tone: "bg-[#fbe9e8] text-[#bb5b55]" },
];
const filters: Array<"ALL" | DevelopmentDomain> = ["ALL", "LANGUAGE", "COGNITIVE", "PHYSICAL", "SOCIAL", "EMOTIONAL"];

export function RecommendationsView({ session, selectedChildId }: { session: SessionUser; selectedChildId?: string }) {
  const children = useStoreSelector((state) => getAuthorizedChildren(state, session));
  const childId = selectedChildId && children.some((child) => child.id === selectedChildId) ? selectedChildId : children[0]?.id ?? "";
  const child = children.find((item) => item.id === childId);
  const recommendations = useStoreSelector((state) => childId ? getChildRecommendations(state, childId) : []);
  const parentRecommendations = recommendations.filter((item) => item.status === "ACTIVE" && item.approvedForParent);
  const [filter, setFilter] = useState<typeof filters[number]>("ALL");
  const visibleIdeas = filter === "ALL" ? ideas : ideas.filter((idea) => idea.domain === filter);

  if (session.role === "PARENT") return <main className="mx-auto max-w-2xl space-y-4 pb-6">
    <header className="flex items-center gap-3"><Link href="/dashboard" aria-label="Back to home" className="rounded-full p-2 text-stone-600 hover:bg-white"><ArrowLeft className="h-5 w-5" /></Link><div><h1 className="font-semibold text-stone-800">Activities to Try</h1>{child && <p className="text-xs text-stone-500">For {child.fullName} · {ageLabel(child.dateOfBirth)}</p>}</div></header>
    {child && <section className="relative flex min-h-36 items-center overflow-hidden rounded-3xl bg-[#f1f6e9] p-4"><div className="relative z-10 max-w-[62%]"><h2 className="text-lg font-semibold leading-snug text-[#315f3a]">Ways to support {child.fullName.split(" ")[0]} at home</h2><p className="mt-1 text-xs text-stone-600">Small moments of play help children explore.</p></div><Image src="/illustrations/child-playing-blocks.png" alt="Child playing with blocks" width={180} height={140} className="absolute bottom-0 right-1 h-32 w-40 object-contain" priority /></section>}
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter activities">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={cn("shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold", filter === item ? "bg-[#24733d] text-white" : "bg-white text-stone-600")}>{item === "ALL" ? "All" : domainLabel(item, session.preferredLanguage)}</button>)}</div>
    <section className="space-y-3">{parentRecommendations.map((item) => <article key={item.id} className="flex items-center gap-3 rounded-3xl border border-[#eee8dc] bg-white p-3 shadow-sm"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f0e9fa] text-[#8256b1]"><Lightbulb className="h-6 w-6" /></span><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-stone-800">{item.title}</h2><p className="mt-1 text-xs text-stone-600">{item.description}</p><p className="mt-1 text-[10px] font-medium text-[#386d43]">Shared by your Anganwadi center</p></div><ChevronRight className="h-5 w-5 text-stone-400" /></article>)}
      {visibleIdeas.map(({ title, description, domain, icon: Icon, tone }) => <article key={title} className="flex items-center gap-3 rounded-3xl border border-[#eee8dc] bg-white p-3 shadow-sm"><span className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl ${tone}`}><Icon className="h-7 w-7" /></span><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-stone-800">{title}</h2><p className="mt-1 text-xs leading-relaxed text-stone-600">{description}</p><span className="mt-1 inline-block text-[10px] font-medium" style={{ color: tone.includes("forest") ? "#426c46" : undefined }}>{domainLabel(domain, session.preferredLanguage)}</span></div><ChevronRight className="h-5 w-5 shrink-0 text-stone-400" /></article>)}
    </section>
    <p className="rounded-2xl bg-[#f7f7ef] p-3 text-xs text-stone-600">These are general play ideas, not a developmental assessment. Follow your child&apos;s interest and keep activities comfortable and supervised.</p>
    <Link href="/messages" className="flex items-center justify-between rounded-2xl bg-[#fff3df] p-4"><span><span className="block text-sm font-semibold text-stone-800">Need more ideas?</span><span className="mt-1 block text-xs text-stone-600">Talk to your Anganwadi worker</span></span><MessageCircle className="h-6 w-6 text-[#a86120]" /></Link>
  </main>;

  return <div className="space-y-6"><h1 className="text-2xl font-bold text-stone-800">Recommendations</h1><div className="flex gap-2 overflow-x-auto pb-2">{children.map((item) => <Link key={item.id} href={`/recommendations?childId=${item.id}`} className={cn("rounded-xl px-4 py-2 text-sm font-medium whitespace-nowrap", childId === item.id ? "bg-forest text-white" : "bg-stone-100 text-stone-600")}>{item.fullName}</Link>)}</div><p className="text-sm text-stone-500">Recommendations should be reviewed before sharing with parents.</p><div className="space-y-3">{recommendations.map((item) => <article key={item.id} className="card p-5"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-light"><Lightbulb className="h-5 w-5 text-amber-600" /></div><div className="flex-1"><h2 className="font-semibold text-stone-800">{item.title}</h2><p className="mt-2 text-sm text-stone-600">{item.description}</p></div><span className="badge bg-forest/10 text-forest">{item.status}</span></div></article>)}{!recommendations.length && <div className="card p-12 text-center text-stone-500">No recommendations yet.</div>}</div></div>;
}
