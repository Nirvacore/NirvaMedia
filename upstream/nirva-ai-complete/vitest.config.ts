import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", "dist", "e2e"],
    // Isolate tests from the dev database — otherwise test fixtures
    // (content, orgs, translations) pollute server/data/nirva.db.
    env: {
      DATABASE_PATH: path.resolve(__dirname, "server", "data", "nirva-test.db"),
    },
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});
