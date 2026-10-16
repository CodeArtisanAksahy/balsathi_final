import { Brain, Info } from "lucide-react";

export default function AdminAiRulesPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center"><Brain className="w-4 h-4 text-purple-600" /></div>
        <h1 className="text-2xl font-bold text-stone-800">AI Rules &amp; Configuration</h1>
      </div>
      <div role="status" className="card p-6 space-y-3">
        <div className="flex items-start gap-2 text-amber-800"><Info className="mt-0.5 h-4 w-4 shrink-0" /><h2 className="font-semibold">Runtime rules are not configurable here</h2></div>
        <p className="text-sm text-stone-600">The rule switches shown previously changed only local page state and were not saved or applied to processing. They have been removed. No growth anomaly model or notification rule is activated from this screen.</p>
        <p className="text-sm text-stone-600">Assistant behavior depends on the configured runtime services and existing code. Recommendations and developmental records should not be treated as clinical assessments.</p>
      </div>
    </div>
  );
}
