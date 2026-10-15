"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, Eye, EyeOff, UserRound, Users, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type DemoRole = {
  email: string;
  label: string;
  description: string;
  icon: typeof UserRound;
  color: string;
};

const demoRoles: DemoRole[] = [
  {
    email: "worker@balsathi.demo",
    label: "Anganwadi Worker",
    description: "Record observations, track milestones, view child profiles",
    icon: UserRound,
    color: "bg-forest/10 text-forest border-forest/30",
  },
  {
    email: "parent@balsathi.demo",
    label: "Parent / Guardian",
    description: "View child progress, messages, and home activities",
    icon: Users,
    color: "bg-blue-100 text-blue-600 border-blue-300",
  },
  {
    email: "admin@balsathi.demo",
    label: "Administrator",
    description: "Manage users, centers, analytics, and audit logs",
    icon: ShieldCheck,
    color: "bg-purple-100 text-purple-600 border-purple-300",
  },
];

export function LoginForm({ dataMode }: { dataMode: "demo" | "sqlite" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

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

  async function quickLogin(role: DemoRole) {
    setSelectedRole(role.email);
    setEmail(role.email);
    setPassword("balsathi123");
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: role.email, password: "balsathi123", locale: "en" }),
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
      setSelectedRole(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Demo role cards are unavailable for real database accounts. */}
      {dataMode === "demo" && <div>
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Quick Demo Login</p>
        <div className="grid grid-cols-3 gap-2">
          {demoRoles.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.email}
                type="button"
                onClick={() => quickLogin(role)}
                disabled={loading}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                  role.color,
                  "hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50",
                  selectedRole === role.email && "ring-2 ring-offset-1 ring-forest",
                )}
              >
                {loading && selectedRole === role.email ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
                <span className="text-[11px] font-semibold leading-tight text-center">{role.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-stone-400 text-center mt-2">
          Click a role to instantly log in with the demo account
        </p>
      </div>}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-stone-400">or sign in manually</span>
        </div>
      </div>

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
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pl-10 pr-10"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-stone-600 cursor-pointer">
            <input type="checkbox" className="accent-forest w-4 h-4 rounded" defaultChecked />
            Remember me
          </label>
          <button type="button" className="text-forest hover:underline font-medium">
            Forgot password?
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-risk-red-light text-risk-red text-sm px-3 py-2">{error}</div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
        </button>
      </form>

      {dataMode === "demo" && <p className="text-center text-xs text-stone-400">
        Demo password for all accounts: <span className="font-mono font-medium">balsathi123</span>
      </p>}
    </div>
  );
}
