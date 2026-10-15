import { cp, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standalone = path.join(projectRoot, ".next", "standalone");
await mkdir(path.join(standalone, ".next"), { recursive: true });
await cp(path.join(projectRoot, ".next", "static"), path.join(standalone, ".next", "static"), { recursive: true });
await cp(path.join(projectRoot, "public"), path.join(standalone, "public"), { recursive: true });

const server = spawn(process.execPath, ["server.js"], {
  cwd: standalone,
  env: { ...process.env, NODE_ENV: "production" },
  stdio: "inherit",
});
server.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
server.on("error", (error) => {
  console.error("Unable to start the standalone Next.js server.");
  console.error(error.message);
  process.exitCode = 1;
});
