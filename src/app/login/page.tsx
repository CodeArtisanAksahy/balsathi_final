import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-forest flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9 text-white">
              <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M12 22V12M4 7l8 5 8-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-stone-800">Balsathi AI</h1>
          <p className="text-stone-500 text-sm mt-1">Nurturing Every Child&apos;s Development Through AI</p>
        </div>
        <div className="card p-6">
          <LoginForm />
        </div>
        <p className="text-center text-xs text-stone-400 mt-4">
          Demo accounts: worker@balsathi.demo, parent@balsathi.demo, admin@balsathi.demo
          <br />Password: balsathi123
        </p>
      </div>
    </div>
  );
}
