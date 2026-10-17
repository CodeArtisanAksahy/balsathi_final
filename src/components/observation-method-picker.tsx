import Link from "next/link";
import Image from "next/image";
import { Camera, FileText, Mic, LockKeyhole } from "lucide-react";

function methodHref(method: string, childId?: string) {
  const query = new URLSearchParams({ method, compose: "1" });
  if (childId) query.set("childId", childId);
  return `/observations/new?${query.toString()}`;
}

export function ObservationMethodPicker({ sqliteMode, childId }: { sqliteMode: boolean; childId?: string }) {
  const voiceAvailable = !sqliteMode;
  const photoAvailable = !sqliteMode;

  return (
    <main className="mx-auto max-w-3xl space-y-4 pb-6">
      <header>
        <h1 className="text-xl font-bold text-stone-800 sm:text-2xl">Add Observation</h1>
        <p className="mt-1 text-sm text-stone-500">Choose how you want to add an observation.</p>
      </header>

      <section aria-label="Choose observation method" className="grid grid-cols-2 gap-3 sm:gap-4">
        {voiceAvailable ? <Link href="/observations/voice" className="group flex min-h-32 flex-col items-center justify-center rounded-2xl border border-[#e4eadc] bg-[#f5f8ef] p-4 text-center transition hover:border-[#b9cba9] hover:bg-[#eff5e8]">
          <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e6efdb] text-[#527b46]"><Mic className="h-6 w-6" /></span>
          <span className="text-sm font-semibold text-stone-800">Voice Note</span>
          <span className="mt-1 text-xs text-stone-600">Speak and record what you observed.</span>
        </Link> : <UnavailableMethod icon={Mic} title="Voice Note" detail="Recording and transcription are not enabled for SQLite." tone="green" />}

        <Link href={methodHref("TEXT", childId)} className="group flex min-h-32 flex-col items-center justify-center rounded-2xl border border-[#f0e5d0] bg-[#fff8eb] p-4 text-center transition hover:border-[#e5c992] hover:bg-[#fff4df]">
          <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ffefd0] text-[#c57d25]"><FileText className="h-6 w-6" /></span>
          <span className="text-sm font-semibold text-stone-800">Text Note</span>
          <span className="mt-1 text-xs text-stone-600">Type your observation in words.</span>
        </Link>

        {photoAvailable ? <Link href="/observations/photo" className="group col-span-2 flex min-h-24 items-center justify-center gap-4 rounded-2xl border border-[#e9e1f2] bg-[#f8f4fc] p-4 text-left transition hover:border-[#cdb9e2] hover:bg-[#f3edfa]">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eee5f7] text-[#865da9]"><Camera className="h-6 w-6" /></span>
          <span><span className="block text-sm font-semibold text-stone-800">Photo / Image</span><span className="mt-1 block text-xs text-stone-600">Capture or upload an image with a note.</span></span>
        </Link> : <UnavailableMethod icon={Camera} title="Photo / Image" detail="Photo uploads are not enabled for SQLite." tone="purple" wide />}
      </section>

      {sqliteMode && <p role="status" className="rounded-xl border border-[#e7dfce] bg-[#fffdf7] px-3 py-2 text-xs text-stone-600">Text notes are available. Voice recording and photo uploads require configured media services.</p>}

      <section className="relative grid min-h-48 grid-cols-[1fr_1.1fr] items-center overflow-hidden rounded-2xl border border-[#e9e5d9] bg-gradient-to-br from-[#f5f8ef] via-[#fffefa] to-[#f0f6e9] p-3 sm:min-h-56 sm:p-5" aria-label="How observations help children">
        <div className="pointer-events-none absolute bottom-0 right-2 h-16 w-20 text-[#8fb579]/70" aria-hidden="true">
          <svg viewBox="0 0 100 80" className="h-full w-full"><path d="M51 78V39m0 26L28 47m23 9 24-22M51 49 42 25m9 18 17-24" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="4"/><ellipse cx="27" cy="44" rx="12" ry="6" transform="rotate(25 27 44)" fill="currentColor"/><ellipse cx="76" cy="33" rx="13" ry="6" transform="rotate(-28 76 33)" fill="currentColor"/><ellipse cx="42" cy="23" rx="11" ry="5" transform="rotate(65 42 23)" fill="currentColor"/><ellipse cx="67" cy="23" rx="12" ry="5" transform="rotate(-45 67 23)" fill="currentColor"/><path d="M36 78h33" stroke="#a58a5d" strokeLinecap="round" strokeWidth="4"/></svg>
        </div>
        <div className="relative flex items-end justify-center self-stretch" aria-hidden="true">
          <div className="relative z-10 -mr-2 mb-1 w-16 sm:w-20">
            <Image src="/illustrations/child-playing-blocks.png" alt="" width={104} height={82} sizes="80px" className="h-auto w-full object-contain" />
          </div>
          <div className="relative z-10 w-24 sm:w-32">
            <Image src="/illustrations/anganwadi-worker-tablet.png" alt="" width={130} height={144} sizes="128px" className="h-auto w-full object-contain" />
          </div>
        </div>
        <div className="relative z-10 rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm sm:p-4">
          <p className="text-xs font-medium leading-relaxed text-stone-700 sm:text-sm">Your observation helps with early identification and better support for each child.</p>
        </div>
      </section>
    </main>
  );
}

function UnavailableMethod({ icon: Icon, title, detail, tone, wide = false }: { icon: typeof Mic; title: string; detail: string; tone: "green" | "purple"; wide?: boolean }) {
  const tint = tone === "green" ? "bg-[#f6f8f3] border-[#e6ebdf] text-[#64765d]" : "bg-[#f8f6fa] border-[#ece6f1] text-[#786988]";
  const iconTint = tone === "green" ? "bg-[#e9eee3] text-[#718768]" : "bg-[#eee9f3] text-[#8b78a0]";
  return <div aria-disabled="true" className={`${wide ? "col-span-2 flex min-h-24 items-center justify-center gap-4 text-left" : "flex min-h-32 flex-col items-center justify-center text-center"} rounded-2xl border p-4 opacity-80 ${tint}`}>
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconTint}`}><Icon className="h-6 w-6" /></span>
    <span className={wide ? "" : "mt-2"}><span className="flex items-center justify-center gap-1 text-sm font-semibold text-stone-700"><span>{title}</span><LockKeyhole className="h-3 w-3 text-stone-400" /></span><span className="mt-1 block text-[10px] leading-snug text-stone-500">{detail}</span></span>
  </div>;
}
