import { spawn } from "node:child_process";

async function run(command, args) {
  const child = spawn(command, args, { cwd: "/app", env: process.env, stdio: "inherit" });
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) reject(new Error(`${command} exited with signal ${signal}.`));
      else resolve(code ?? 1);
    });
  });
}

if (process.env.DATA_MODE === "sqlite" && process.env.RUN_DB_MIGRATIONS !== "false") {
  const exitCode = await run(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy", "--schema", "/app/prisma/schema.prisma"]);
  if (exitCode !== 0) process.exit(Number(exitCode));
}

const exitCode = await run(process.execPath, ["server.js"]);
process.exit(Number(exitCode));
