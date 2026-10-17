import Link from "next/link";
import { Bell, HeartPulse, HelpCircle, Settings, ChevronRight } from "lucide-react";

const links = [
  { href: "/parent/health", title: "Health & Nutrition", description: "General health, food, and care guidance", icon: HeartPulse },
  { href: "/help", title: "Help & Support", description: "FAQs and contact your Anganwadi worker", icon: HelpCircle },
  { href: "/notifications", title: "Notifications", description: "Updates sent to your account", icon: Bell },
  { href: "/parent/settings", title: "Settings", description: "Account and preferences", icon: Settings },
];

export default function ParentMorePage() {
  return <div className="mx-auto max-w-2xl space-y-4 pb-6"><header><h1 className="text-xl font-bold text-stone-800">More</h1><p className="mt-1 text-sm text-stone-500">Help, health guidance, and account settings</p></header><div className="space-y-3">{links.map(({ href, title, description, icon: Icon }) => <Link href={href} key={href} className="card flex items-center gap-3 p-4"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#eff6eb] text-[#386d43]"><Icon className="h-5 w-5"/></span><span className="min-w-0 flex-1"><span className="block font-semibold text-stone-800">{title}</span><span className="mt-0.5 block text-sm text-stone-500">{description}</span></span><ChevronRight className="h-5 w-5 text-stone-400"/></Link>)}</div></div>;
}
