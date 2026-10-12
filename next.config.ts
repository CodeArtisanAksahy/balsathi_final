import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Request-bound route handlers cannot be used with Cache Components.
  cacheComponents: false,
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  output: "standalone",
};

export default nextConfig;
