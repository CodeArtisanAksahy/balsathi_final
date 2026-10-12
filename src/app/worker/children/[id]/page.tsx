import { redirect } from "next/navigation";
export default async function WorkerChildAlias({ params }: { params: Promise<{ id: string }> }) { redirect(`/children/${(await params).id}`); }
