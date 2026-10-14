"use client";

import { useRouter } from "next/navigation";
import { Lightbulb, BookOpen, CheckCircle2, ChevronRight } from "lucide-react";
import type { SessionUser } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { useStoreSelector } from "@/hooks/use-store";
import { getAuthorizedChildren, getChildRecommendations } from "@/lib/selectors";

export function RecommendationsView({
  session,
  selectedChildId,
}: {
  session: SessionUser;
  selectedChildId?: string;
}) {
  const router = useRouter();
  const children = useStoreSelector((state) => getAuthorizedChildren(state, session));
  const childId = selectedChildId ?? children[0]?.id ?? "";
  const recommendations = useStoreSelector((state) =>
    childId ? getChildRecommendations(state, childId) : [],
  );

  function selectChild(id: string) {
    router.push(`/recommendations?childId=${id}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">
        {session.role === "PARENT" ? "Activities for Home" : "Recommendations"}
      </h1>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {children.map((c) => (
          <button
            key={c.id}
            onClick={() => selectChild(c.id)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition",
              childId === c.id ? "bg-forest text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200",
            )}
          >
            {c.fullName}
          </button>
        ))}
      </div>

      {session.role !== "PARENT" && (
        <p className="text-sm text-stone-500">
          AI-generated recommendations should be reviewed before sharing with parents.
        </p>
      )}

      <div className="space-y-3">
        {recommendations.map((r) => (
          <div key={r.id} className="card p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-light flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-stone-800">{r.title}</h3>
                  <span className="badge bg-forest/10 text-forest">{r.status}</span>
                  {r.approvedForParent && session.role === "WORKER" && (
                    <span className="badge bg-blue-100 text-blue-600"><CheckCircle2 className="w-3 h-3" /> Parent-approved</span>
                  )}
                </div>
                <p className="text-sm text-stone-600 mt-2">{r.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-stone-300" />
            </div>
          </div>
        ))}
        {recommendations.length === 0 && (
          <div className="card p-12 text-center">
            <BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500">No recommendations yet. They will appear as observations are recorded.</p>
          </div>
        )}
      </div>
    </div>
  );
}
