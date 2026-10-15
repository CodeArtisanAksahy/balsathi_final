"use client";

import { clientStore } from "@/lib/client-store";
import type { DemoData } from "@/lib/domain";

let modePromise: Promise<string> | undefined;
export function getConfiguredDataMode(): Promise<string> {
  modePromise ??= fetch("/api/health", { cache: "no-store" }).then((res) => res.json()).then((data) => String(data.mode ?? "demo")).catch(() => "demo");
  return modePromise;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const res = await fetch(path, {
    headers: { ...(isFormData ? {} : { "Content-Type": "application/json" }), ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message ?? `Request failed: ${res.status}`);
  }
  const data = await res.json();
  if (typeof window !== "undefined" && init?.method && init.method !== "GET" && await getConfiguredDataMode() === "sqlite") {
    const bootstrap = await fetch("/api/bootstrap", { cache: "no-store" });
    if (bootstrap.ok) {
      const payload = await bootstrap.json();
      if (payload.data?.state) clientStore.replace(payload.data.state as DemoData);
    }
    if (path.includes("/observations")) window.dispatchEvent(new CustomEvent("balsathi:observations-updated"));
  }
  return data.data as T;
}
