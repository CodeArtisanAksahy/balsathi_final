import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default function Home() {
  redirect("/login");
}
