import { ChatWidget } from "@/components/chat-widget";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AssistantPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <section className="min-h-[70vh] rounded-2xl border border-stone-200 bg-stone-50 p-6">
      <p className="text-sm font-medium text-forest">Balsathi AI Assistant</p>
      <h1 className="mt-1 text-2xl font-bold text-stone-900">Authorized record assistant</h1>
      <p className="mt-2 max-w-xl text-sm text-stone-600">
        Demo responses are grounded in the child records available to your current account. They are not diagnoses or clinical advice.
      </p>
      <ChatWidget session={session} defaultOpen />
    </section>
  );
}
