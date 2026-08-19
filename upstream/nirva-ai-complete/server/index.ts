import { createServer } from "http";
import express from "express";
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";
import { createApiRouter } from "./api.ts";
import { applyMiddleware } from "./middleware/index.ts";
import { initWebSocket } from "./ws/index.ts";
import { handleOAuthCallback } from "./auth/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  applyMiddleware(app);
  app.use(express.json({ limit: "1mb" }));

  // Manus Space OAuth (ai.nirva.one) — same handler as /api/oauth/callback
  app.get("/manus-oauth/callback", (req, res) => {
    handleOAuthCallback(req, res).catch(() => res.redirect("/?auth_error=server_error"));
  });

  app.use("/api", createApiRouter());

  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  const storybookPath = path.join(staticPath, "storybook");
  if (fs.existsSync(storybookPath)) {
    app.use("/storybook", express.static(storybookPath));
    app.get("/storybook/*", (_req, res) => {
      res.sendFile(path.join(storybookPath, "index.html"));
    });
  }

  app.use(express.static(staticPath));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || "0.0.0.0";

  initWebSocket(server);

  server.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}/`);
    if (fs.existsSync(storybookPath)) {
      console.log(`Storybook demo: http://localhost:${port}/storybook/`);
    }
    console.log(`API docs: http://localhost:${port}/api/docs`);
    console.log(`Demo hub: http://localhost:${port}/demo`);
  });
}

startServer().catch((err) => {
  console.error("Fatal: server failed to start", err);
  process.exit(1);
});
