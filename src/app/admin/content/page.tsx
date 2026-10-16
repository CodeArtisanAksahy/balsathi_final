import { BookOpen } from "lucide-react";

export default function AdminContentPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center"><BookOpen className="w-4 h-4 text-indigo-600" /></div>
        <h1 className="text-2xl font-bold text-stone-800">Content Management</h1>
      </div>
      <div role="status" className="card p-6 space-y-2">
        <h2 className="font-semibold text-stone-800">A persistent content catalog is not configured</h2>
        <p className="text-sm text-stone-600">Activities and guidance cannot be created or edited from this page yet. The previous sample content and local-only save controls have been removed so they cannot be mistaken for saved records.</p>
      </div>
    </div>
  );
}
