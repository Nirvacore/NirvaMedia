import type { Express } from "express";
import { corsMiddleware, securityHeaders, rateLimitMiddleware } from "./security.ts";
import { requestLogger } from "./logger.ts";

export function applyMiddleware(app: Express) {
  app.use(requestLogger);
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(rateLimitMiddleware);
}
