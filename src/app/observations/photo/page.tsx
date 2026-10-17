import { getSession } from "@/lib/auth";
import PhotoObservationClient from "./photo-observation-client";

export default async function PhotoObservationPage() {
  const session = await getSession();
  if (!session) return null;
  if (session.role === "PARENT") {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-stone-800">Photo Observation</h1>
        <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Parents can view observations, but only an Anganwadi worker or administrator can record official observations.
        </div>
      </div>
    );
  }
  return <PhotoObservationClient />;
}
