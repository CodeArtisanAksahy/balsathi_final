import type { DemoData } from "./domain";
import { createDemoData } from "./demo-data";

const STORAGE_KEY = "balsathi:client-store:v1";

type Listener = () => void;

class ClientStore {
  private state: DemoData;
  private listeners = new Set<Listener>();

  constructor() {
    this.state = this.load();
  }

  private load(): DemoData {
    if (typeof window === "undefined") {
      return createDemoData();
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DemoData;
        if (parsed && parsed.children && parsed.observations) {
          return parsed;
        }
      }
    } catch {
      // ignore parse errors, fall through to seed
    }
    const seeded = createDemoData();
    this.persist(seeded);
    return seeded;
  }

  private persist(state: DemoData) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage may be full or unavailable; ignore
    }
  }

  getState(): DemoData {
    return this.state;
  }

  getSnapshot = (): DemoData => {
    return this.state;
  };

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Apply an immutable update to the store state.
   * The updater receives a shallow copy and must return the new state.
   */
  setState(updater: (draft: DemoData) => DemoData) {
    const next = updater(this.state);
    if (next === this.state) return;
    this.state = next;
    this.persist(next);
    this.emit();
  }

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  /** Reset store to fresh seed data. Caller must confirm first. */
  reset() {
    const seeded = createDemoData();
    this.state = seeded;
    this.persist(seeded);
    this.emit();
  }

  /** Replace entire state (used for cross-tab sync or import). */
  replace(state: DemoData) {
    this.state = state;
    this.emit();
  }
}

export const clientStore = new ClientStore();

// Cross-tab synchronization via storage events
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue) as DemoData;
        if (parsed && parsed.children) {
          clientStore.replace(parsed);
        }
      } catch {
        // ignore
      }
    }
  });
}
