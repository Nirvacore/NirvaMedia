#!/usr/bin/env node
/**
 * One-time setup: .env, data dir, dependencies check
 */
import { existsSync, copyFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

if (!existsSync(resolve(root, ".env"))) {
  copyFileSync(resolve(root, ".env.example"), resolve(root, ".env"));
  console.log("✓ Created .env from .env.example");
} else {
  console.log("✓ .env exists");
}

mkdirSync(resolve(root, "data"), { recursive: true });
console.log("✓ data/ directory ready");

if (!existsSync(resolve(root, "node_modules"))) {
  console.log("→ Running pnpm install...");
  execSync("pnpm install", { cwd: root, stdio: "inherit" });
} else {
  console.log("✓ node_modules exists");
}

console.log("");
console.log("Setup complete. Start with:");
console.log("  pnpm go          # production (recommended)");
console.log("  pnpm dev         # development with hot reload");
console.log("  docker compose up -d --build   # full stack with AI services");
