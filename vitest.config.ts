import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.tsx", "src/lib/store.test.ts", "src/lib/sync.test.ts", "src/lib/fetch.test.ts", "src/lib/request-security.test.ts", "src/lib/validation.test.ts", "src/lib/model-readiness.test.ts"],
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
