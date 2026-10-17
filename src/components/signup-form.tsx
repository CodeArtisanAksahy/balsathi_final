"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Baby, BriefcaseBusiness, CheckCircle2, LoaderCircle, Mail, Phone, UserRound } from "lucide-react";

type Role = "PARENT" | "WORKER";

export function SignupForm() {
  const [role, setRole] = useState<Role>("PARENT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          role,
          ...(role === "WORKER" ? { centerName: formData.get("centerName") } : {
            childReference: formData.get("childReference"),
            relationship: formData.get("relationship"),
          }),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error?.message ?? "We could not submit your request. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return <section className="card px-6 py-10 text-center shadow-xl sm:px-10">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e9f4e7] text-forest"><CheckCircle2 className="h-8 w-8" /></span>
      <h1 className="mt-5 text-2xl font-bold text-stone-800">Request submitted</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">Your details are with the Balsathi administrator for verification. You’ll receive your account setup instructions after they confirm your information.</p>
      <Link href="/login" className="btn-primary mx-auto mt-6 justify-center">Back to sign in</Link>
    </section>;
  }

  return <section className="card overflow-hidden shadow-xl">
    <div className="bg-[#f0f5e9] px-6 py-7 sm:px-9">
      <Link href="/login" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-forest"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest">Balsathi AI</p>
      <h1 className="mt-2 text-3xl font-bold text-stone-800">Create your account</h1>
      <p className="mt-2 text-sm leading-6 text-stone-600">Enter your details to request access. An administrator will verify your center or child connection before setting up your sign-in.</p>
    </div>

    <form action={submit} className="space-y-5 px-6 py-7 sm:px-9">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-stone-700">I am a</legend>
        <div className="grid grid-cols-2 gap-3">
          {([{ role: "PARENT", label: "Parent / Guardian", Icon: Baby }, { role: "WORKER", label: "Anganwadi Worker", Icon: BriefcaseBusiness }] as const).map(({ role: value, label, Icon }) => (
            <button key={value} type="button" aria-pressed={role === value} onClick={() => setRole(value)} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${role === value ? "border-forest bg-[#edf5e9] text-forest ring-1 ring-forest" : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-stone-700 sm:col-span-2">Full name
          <span className="relative mt-1 block"><UserRound className="absolute left-3 top-3 h-4 w-4 text-stone-400" /><input name="name" autoComplete="name" required minLength={2} maxLength={120} className="input pl-10" placeholder="Your full name" /></span>
        </label>
        <label className="block text-sm font-medium text-stone-700">Email address
          <span className="relative mt-1 block"><Mail className="absolute left-3 top-3 h-4 w-4 text-stone-400" /><input name="email" type="email" autoComplete="email" required className="input pl-10" placeholder="you@example.com" /></span>
        </label>
        <label className="block text-sm font-medium text-stone-700">Phone number
          <span className="relative mt-1 block"><Phone className="absolute left-3 top-3 h-4 w-4 text-stone-400" /><input name="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={20} className="input pl-10" placeholder="Your contact number" /></span>
        </label>
      </div>

      {role === "PARENT" ? <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-stone-700 sm:col-span-2">Child’s name or record ID<input name="childReference" required minLength={2} maxLength={120} className="input mt-1" placeholder="As recorded at the Anganwadi center" /></label>
        <label className="block text-sm font-medium text-stone-700 sm:col-span-2">Your relationship to the child<select name="relationship" required className="input mt-1"><option value="MOTHER">Mother</option><option value="FATHER">Father</option><option value="GRANDPARENT">Grandparent</option><option value="SIBLING">Sibling</option><option value="OTHER">Other guardian</option></select></label>
      </div> : <label className="block text-sm font-medium text-stone-700">Anganwadi center<input name="centerName" required minLength={2} maxLength={120} className="input mt-1" placeholder="Center name or code" /></label>}

      {error && <div role="alert" className="rounded-xl bg-risk-red-light px-4 py-3 text-sm text-risk-red">{error}</div>}
      <div className="rounded-xl bg-[#f8f7f1] p-3 text-xs leading-5 text-stone-500">This form sends an account request for administrator review. It does not create an active login or ask you to enter a password.</div>
      <button type="submit" disabled={busy} className="btn-primary w-full justify-center disabled:opacity-60">{busy ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Sending request…</> : "Submit signup request"}</button>
    </form>
  </section>;
}
