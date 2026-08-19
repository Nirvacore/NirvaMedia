import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: "http://localhost:3099",
    headless: true,
  },
  webServer: {
    command: "PORT=3099 NODE_ENV=production node dist/index.js",
    port: 3099,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
