"use client";

import { useRef, useSyncExternalStore } from "react";
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
  const cache = useRef<{ state: DemoData; selector: (state: DemoData) => T; value: T } | null>(null);
  const getSelection = () => {
    const state = clientStore.getSnapshot();
    const previous = cache.current;
    if (previous?.state === state && previous.selector === selector) return previous.value;
    const value = selector(state);
    if (previous && selectionsEqual(previous.value, value)) {
      cache.current = { state, selector, value: previous.value };
      return previous.value;
    }
    cache.current = { state, selector, value };
    return value;
  };
  return useSyncExternalStore(clientStore.subscribe, getSelection, getSelection);
}

function selectionsEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((item, index) => selectionsEqual(item, right[index]));
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const keys = Object.keys(leftRecord);
  return keys.length === Object.keys(rightRecord).length && keys.every((key) => selectionsEqual(leftRecord[key], rightRecord[key]));
}

/**
 * Get the raw store instance for imperative mutations.
 */
export function useStore() {
  return clientStore;
}
