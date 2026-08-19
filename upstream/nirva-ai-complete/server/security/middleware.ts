/**
 * NMD Security Middleware
 * Rate limiting, CORS, input validation, security headers
 */

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
}

export interface SecurityHeaders {
  [key: string]: string;
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const defaultRateLimitConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  message: "Too many requests, please try again later",
};

/**
 * Rate limiting middleware
 */
export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...defaultRateLimitConfig, ...config };

  return function rateLimiter(identifier: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const record = rateLimitStore.get(identifier);

    if (!record || record.resetTime < now) {
      // Reset or first request
      rateLimitStore.set(identifier, {
        count: 1,
        resetTime: now + finalConfig.windowMs,
      });
      return { allowed: true, remaining: finalConfig.maxRequests - 1 };
    }

    record.count++;

    if (record.count > finalConfig.maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: finalConfig.maxRequests - record.count };
  };
}

/**
 * Security headers middleware
 */
export function getSecurityHeaders(): SecurityHeaders {
  return {
    // Prevent clickjacking
    "X-Frame-Options": "DENY",

    // Prevent MIME type sniffing
    "X-Content-Type-Options": "nosniff",

    // XSS protection
    "X-XSS-Protection": "1; mode=block",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",

    // HSTS (HTTP Strict Transport Security)
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",

    // Referrer Policy
    "Referrer-Policy": "strict-origin-when-cross-origin",

    // Permissions Policy
    "Permissions-Policy":
      "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",

    // Feature Policy
    "Feature-Policy": "geolocation 'none'; microphone 'none'; camera 'none'; payment 'none'",
  };
}

/**
 * CORS configuration
 */
export const corsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Organization-ID", "X-User-ID"],
  maxAge: 86400, // 24 hours
};

/**
 * Input validation rules
 */
export interface ValidationRule {
  field: string;
  type: "string" | "number" | "email" | "url" | "json" | "array";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  sanitize?: (val: string) => string;
}

/**
 * Validate input against rules
 */
export function validateInput(data: Record<string, unknown>, rules: ValidationRule[]): {
  valid: boolean;
  errors: Record<string, string>;
  sanitized: Record<string, unknown>;
} {
  const errors: Record<string, string> = {};
  const sanitized: Record<string, unknown> = {};

  for (const rule of rules) {
    const value = data[rule.field];

    // Check required
    if (rule.required && (value === undefined || value === null || value === "")) {
      errors[rule.field] = `${rule.field} is required`;
      continue;
    }

    if (value === undefined || value === null) {
      continue;
    }

    // Type validation
    switch (rule.type) {
      case "string": {
        if (typeof value !== "string") {
          errors[rule.field] = `${rule.field} must be a string`;
          break;
        }
        if (rule.minLength && value.length < rule.minLength) {
          errors[rule.field] = `${rule.field} must be at least ${rule.minLength} characters`;
          break;
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors[rule.field] = `${rule.field} must be at most ${rule.maxLength} characters`;
          break;
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          errors[rule.field] = `${rule.field} format is invalid`;
          break;
        }
        sanitized[rule.field] = rule.sanitize ? rule.sanitize(value) : value;
        break;
      }

      case "email": {
        if (typeof value !== "string") {
          errors[rule.field] = `${rule.field} must be a string`;
          break;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors[rule.field] = `${rule.field} must be a valid email`;
          break;
        }
        sanitized[rule.field] = value.toLowerCase().trim();
        break;
      }

      case "url": {
        if (typeof value !== "string") {
          errors[rule.field] = `${rule.field} must be a string`;
          break;
        }
        try {
          new URL(value);
          sanitized[rule.field] = value;
        } catch {
          errors[rule.field] = `${rule.field} must be a valid URL`;
        }
        break;
      }

      case "number": {
        const num = Number(value);
        if (isNaN(num)) {
          errors[rule.field] = `${rule.field} must be a number`;
          break;
        }
        sanitized[rule.field] = num;
        break;
      }

      case "array": {
        if (!Array.isArray(value)) {
          errors[rule.field] = `${rule.field} must be an array`;
          break;
        }
        sanitized[rule.field] = value;
        break;
      }

      case "json": {
        if (typeof value !== "string") {
          errors[rule.field] = `${rule.field} must be a string`;
          break;
        }
        try {
          JSON.parse(value);
          sanitized[rule.field] = value;
        } catch {
          errors[rule.field] = `${rule.field} must be valid JSON`;
        }
        break;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  };
}

/**
 * SQL Injection prevention - parameterized queries
 */
export function sanitizeForSQL(input: string): string {
  return input.replace(/['";\\]/g, (char) => {
    const escaped: Record<string, string> = {
      "'": "''",
      '"': '""',
      ";": "\\;",
      "\\": "\\\\",
    };
    return escaped[char] || char;
  });
}

/**
 * XSS prevention - HTML escaping
 */
export function sanitizeForHTML(input: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return input.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * Content Security Policy generator
 */
export function generateCSP(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "media-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
  ].join("; ");
}

/**
 * Clear rate limit records
 */
export function clearRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Get rate limit stats
 */
export function getRateLimitStats(): { total: number; active: number } {
  const now = Date.now();
  let active = 0;

  for (const record of rateLimitStore.values()) {
    if (record.resetTime > now) {
      active++;
    }
  }

  return {
    total: rateLimitStore.size,
    active,
  };
}
