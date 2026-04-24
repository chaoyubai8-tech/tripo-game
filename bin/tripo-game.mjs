#!/usr/bin/env node
// Thin shim: delegate to the compiled CLI if present, otherwise to the TS source via tsx.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compiled = path.join(__dirname, "..", "dist", "cli.js");
const source = path.join(__dirname, "..", "src", "cli.ts");

async function run() {
  if (existsSync(compiled)) {
    await import(compiled);
    return;
  }
  // Dev mode: run via tsx.
  const child = spawn(
    process.execPath,
    [require.resolve("tsx/cli"), source, ...process.argv.slice(2)],
    { stdio: "inherit" },
  );
  child.on("exit", (code) => process.exit(code ?? 0));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
