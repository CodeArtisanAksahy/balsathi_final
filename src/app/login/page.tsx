import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { config } from "@/lib/config";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-forest flex items-center justify-center mx-auto mb-4 shadow-lg shadow-forest/20">
            <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9 text-white">
              <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M12 22V12M4 7l8 5 8-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-stone-800">Balsathi AI</h1>
          <p className="text-stone-500 text-sm mt-1">Nurturing Every Child&apos;s Development Through AI</p>
        </div>
        <div className="card p-6 shadow-xl">
          <LoginForm dataMode={config.dataMode} showLocalDemoAccounts={!config.isProduction && config.dataMode === "sqlite"} />
        </div>
        <p className="mt-5 text-center text-sm text-stone-500">
          New to Balsathi?{" "}
          <Link href="/create-account" className="font-semibold text-forest hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
