import type { Request, Response, NextFunction } from "express";

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:5173").split(",").map((o) => o.trim());

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes("*"))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGINS[0] || "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();
const RATE_LIMIT = Number(process.env.RATE_LIMIT_MAX || 120);
const RATE_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only rate-limit API routes — static assets/chunks should not count
  if (!req.path.startsWith("/api")) {
    next();
    return;
  }
  if (req.path.endsWith("/health") || req.path.endsWith("/metrics")) {
    next();
    return;
  }

  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW_MS };
    buckets.set(key, bucket);
  }

  bucket.count++;
  res.setHeader("X-RateLimit-Limit", String(RATE_LIMIT));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(0, RATE_LIMIT - bucket.count)));

  if (bucket.count > RATE_LIMIT) {
    res.status(429).json({
      error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." },
    });
    return;
  }

  next();
}

// Periodic cleanup of stale buckets
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of Array.from(buckets.entries())) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, RATE_WINDOW_MS).unref();
