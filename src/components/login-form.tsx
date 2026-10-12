"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, locale: "en" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message ?? "Login failed");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function quickFill(e: string) {
    setEmail(e);
    setPassword("balsathi123");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input pl-10"
            placeholder="you@balsathi.demo"
            required
          />
        </div>
      </div>
      <div>
        <label className="label">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input pl-10"
            placeholder="••••••••"
            required
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-risk-red-light text-risk-red text-sm px-3 py-2">{error}</div>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
      </button>

      <div className="pt-2 border-t border-stone-100">
        <p className="text-xs text-stone-500 mb-2 text-center">Quick demo login:</p>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => quickFill("worker@balsathi.demo")} className="btn-secondary text-xs py-2">Worker</button>
          <button type="button" onClick={() => quickFill("parent@balsathi.demo")} className="btn-secondary text-xs py-2">Parent</button>
          <button type="button" onClick={() => quickFill("admin@balsathi.demo")} className="btn-secondary text-xs py-2">Admin</button>
        </div>
      </div>
    </form>
  );
}
