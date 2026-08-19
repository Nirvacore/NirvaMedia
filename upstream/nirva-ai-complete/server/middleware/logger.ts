import type { Request, Response, NextFunction } from "express";

export interface RequestMetrics {
  totalRequests: number;
  totalErrors: number;
  avgResponseMs: number;
  startedAt: string;
}

let totalRequests = 0;
let totalErrors = 0;
let totalResponseMs = 0;
const startedAt = new Date().toISOString();

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  totalRequests++;

  res.on("finish", () => {
    const duration = Date.now() - start;
    totalResponseMs += duration;
    if (res.statusCode >= 400) totalErrors++;

    if (process.env.NODE_ENV !== "production" || process.env.LOG_REQUESTS === "true") {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });

  next();
}

export function getMetrics(): RequestMetrics {
  return {
    totalRequests,
    totalErrors,
    avgResponseMs: totalRequests > 0 ? Math.round(totalResponseMs / totalRequests) : 0,
    startedAt,
  };
}

export function resetMetrics() {
  totalRequests = 0;
  totalErrors = 0;
  totalResponseMs = 0;
}
