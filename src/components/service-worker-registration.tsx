"use client";

import { useEffect } from "react";

/** Registers only the privacy-preserving app-shell service worker. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline installation is optional; the application remains usable online.
      });
    }
  }, []);

  return null;
}
