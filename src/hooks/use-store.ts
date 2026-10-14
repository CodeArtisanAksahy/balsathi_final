"use client";

import { useSyncExternalStore } from "react";
import { clientStore } from "@/lib/client-store";
import type { DemoData } from "@/lib/domain";

/**
 * Subscribe to the entire client store.
 * Returns the current state and re-renders on any change.
 */
export function useStoreState(): DemoData {
  return useSyncExternalStore(clientStore.subscribe, clientStore.getSnapshot, clientStore.getSnapshot);
}

/**
 * Subscribe to a slice of the store using a selector.
 * Re-renders only when the selected value changes (by Object.is comparison).
 */
export function useStoreSelector<T>(selector: (state: DemoData) => T): T {
  return useSyncExternalStore(
    clientStore.subscribe,
    () => selector(clientStore.getSnapshot()),
    () => selector(clientStore.getSnapshot()),
  );
}

/**
 * Get the raw store instance for imperative mutations.
 */
export function useStore() {
  return clientStore;
}
