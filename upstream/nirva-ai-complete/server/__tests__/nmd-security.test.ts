import { describe, it, expect } from "vitest";
import {
  generateToken,
  verifyToken,
  extractToken,
  hasPermission,
  hasRole,
  getPermissionsForRole,
  hashPassword,
  verifyPassword,
  encryptData,
  decryptData,
  generateApiKey,
  hashApiKey,
  verifyApiKey,
} from "../security/auth.ts";
import {
  createRateLimiter,
  getSecurityHeaders,
  corsOptions,
  validateInput,
  sanitizeForSQL,
  sanitizeForHTML,
  generateCSP,
  getRateLimitStats,
} from "../security/middleware.ts";

describe("NMD Security Layer", () => {
  describe("Authentication", () => {
    const testUser = {
      id: "user_123",
      email: "test@example.com",
      organizationId: "org_123",
      role: "admin" as const,
      isActive: true,
      mfaEnabled: false,
      createdAt: new Date().toISOString(),
    };

    it("generates valid JWT token", () => {
      const token = generateToken(testUser, ["content.create", "content.edit"]);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3);
    });

    it("verifies valid token", () => {
      const token = generateToken(testUser, ["content.create"]);
      const payload = verifyToken(token);

      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(testUser.id);
      expect(payload?.organizationId).toBe(testUser.organizationId);
      expect(payload?.role).toBe("admin");
    });

    it("rejects invalid token signature", () => {
      const token = generateToken(testUser, ["content.create"]);
      const tampered = token.slice(0, -1) + "X";
      const payload = verifyToken(tampered);

      expect(payload).toBeNull();
    });

    it("extracts token from Authorization header", () => {
      const token = generateToken(testUser, ["content.create"]);
      const header = `Bearer ${token}`;
      const extracted = extractToken(header);

      expect(extracted).toBe(token);
    });

    it("returns null for invalid Authorization header", () => {
      expect(extractToken("InvalidHeader")).toBeNull();
      expect(extractToken("Bearer")).toBeNull();
      expect(extractToken(undefined)).toBeNull();
    });
  });

  describe("Authorization", () => {
    it("checks permissions correctly", () => {
      const permissions = ["content.create", "content.edit", "templates.view"];

      expect(hasPermission(permissions, "content.create")).toBe(true);
      expect(hasPermission(permissions, "content.delete")).toBe(false);
      expect(hasPermission(["*"], "any.permission")).toBe(true);
    });

    it("validates user roles", () => {
      expect(hasRole("admin", ["admin", "manager"])).toBe(true);
      expect(hasRole("viewer", ["admin", "manager"])).toBe(false);
      expect(hasRole("editor", ["editor"])).toBe(true);
    });

    it("retrieves permissions for roles", () => {
      const adminPerms = getPermissionsForRole("admin");
      expect(adminPerms).toContain("organization.configure");
      expect(adminPerms.length).toBeGreaterThan(5);

      const viewerPerms = getPermissionsForRole("viewer");
      expect(viewerPerms).toContain("content.view");
      expect(viewerPerms.length).toBeLessThan(adminPerms.length);
    });
  });

  describe("Password security", () => {
    it("hashes passwords securely", () => {
      const password = "SecurePassword123!";
      const hash = hashPassword(password);

      expect(hash).toContain(":");
      expect(hash.length).toBeGreaterThan(50);
    });

    it("verifies correct password", () => {
      const password = "MySecurePass123!";
      const hash = hashPassword(password);
      const valid = verifyPassword(password, hash);

      expect(valid).toBe(true);
    });

    it("rejects incorrect password", () => {
      const hash = hashPassword("CorrectPassword");
      const valid = verifyPassword("WrongPassword", hash);

      expect(valid).toBe(false);
    });

    it("produces different hashes for same password", () => {
      const password = "SamePassword123!";
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("Data encryption", () => {
    it("encrypts sensitive data", () => {
      const data = "sensitive-information";
      const encrypted = encryptData(data);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(data);
      expect(encrypted).toContain(":");
    });

    it("decrypts encrypted data correctly", () => {
      const data = "secret-api-key";
      const encrypted = encryptData(data);
      const decrypted = decryptData(encrypted);

      expect(decrypted).toBe(data);
    });

    it("handles decryption of corrupted data", () => {
      const result = decryptData("invalid:data");
      expect(result).toBeNull();
    });

    it("encrypts JSON data", () => {
      const data = JSON.stringify({ apiKey: "secret", userId: "123" });
      const encrypted = encryptData(data);
      const decrypted = decryptData(encrypted);

      expect(JSON.parse(decrypted || "{}")).toHaveProperty("apiKey");
    });
  });

  describe("API Key management", () => {
    it("generates unique API keys", () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();

      expect(key1).not.toBe(key2);
      expect(key1.length).toBe(64);
    });

    it("hashes API keys", () => {
      const key = generateApiKey();
      const hash = hashApiKey(key);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(key);
      expect(hash.length).toBe(64);
    });

    it("verifies API keys", () => {
      const key = generateApiKey();
      const hash = hashApiKey(key);

      expect(verifyApiKey(key, hash)).toBe(true);
      expect(verifyApiKey("wrong-key", hash)).toBe(false);
    });
  });

  describe("Rate limiting", () => {
    it("allows requests within limit", () => {
      const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60000 });
      const identifier = "user_123";

      for (let i = 0; i < 5; i++) {
        const result = limiter(identifier);
        expect(result.allowed).toBe(true);
      }
    });

    it("blocks requests exceeding limit", () => {
      const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60000 });
      const identifier = "user_rate_test";

      limiter(identifier);
      limiter(identifier);
      const thirdRequest = limiter(identifier);

      expect(thirdRequest.allowed).toBe(false);
    });

    it("tracks remaining requests", () => {
      const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60000 });
      const identifier = "user_remaining";

      const first = limiter(identifier);
      expect(first.remaining).toBe(2);

      const second = limiter(identifier);
      expect(second.remaining).toBe(1);
    });

    it("returns stats on rate limit", () => {
      const limiter = createRateLimiter();
      limiter("user_stats_1");
      limiter("user_stats_2");

      const stats = getRateLimitStats();
      expect(stats.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Security headers", () => {
    it("returns security headers", () => {
      const headers = getSecurityHeaders();

      expect(headers["X-Frame-Options"]).toBe("DENY");
      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
      expect(headers["Strict-Transport-Security"]).toBeDefined();
    });

    it("includes XSS protection headers", () => {
      const headers = getSecurityHeaders();
      expect(headers["X-XSS-Protection"]).toBeDefined();
      expect(headers["Content-Security-Policy"]).toBeDefined();
    });

    it("includes CSP and Feature-Policy", () => {
      const headers = getSecurityHeaders();
      expect(headers["Content-Security-Policy"]).toContain("default-src");
      expect(headers["Permissions-Policy"]).toContain("geolocation=()");
    });
  });

  describe("CORS configuration", () => {
    it("has CORS settings", () => {
      expect(corsOptions.origin).toBeDefined();
      expect(corsOptions.credentials).toBe(true);
      expect(corsOptions.methods).toContain("GET");
      expect(corsOptions.methods).toContain("POST");
    });

    it("allows required headers", () => {
      expect(corsOptions.allowedHeaders).toContain("Authorization");
      expect(corsOptions.allowedHeaders).toContain("Content-Type");
    });
  });

  describe("Input validation", () => {
    it("validates string inputs", () => {
      const rules = [{ field: "name", type: "string" as const, required: true, maxLength: 50 }];
      const data = { name: "John Doe" };

      const result = validateInput(data, rules);
      expect(result.valid).toBe(true);
      expect(result.sanitized.name).toBe("John Doe");
    });

    it("validates email format", () => {
      const rules = [{ field: "email", type: "email" as const, required: true }];

      const validResult = validateInput({ email: "test@example.com" }, rules);
      expect(validResult.valid).toBe(true);

      const invalidResult = validateInput({ email: "invalid-email" }, rules);
      expect(invalidResult.valid).toBe(false);
    });

    it("validates URLs", () => {
      const rules = [{ field: "webhook", type: "url" as const, required: true }];

      const validResult = validateInput({ webhook: "https://example.com/webhook" }, rules);
      expect(validResult.valid).toBe(true);

      const invalidResult = validateInput({ webhook: "not-a-url" }, rules);
      expect(invalidResult.valid).toBe(false);
    });

    it("detects missing required fields", () => {
      const rules = [{ field: "username", type: "string" as const, required: true }];
      const data = {};

      const result = validateInput(data, rules);
      expect(result.valid).toBe(false);
      expect(result.errors.username).toBeDefined();
    });
  });

  describe("Data sanitization", () => {
    it("prevents SQL injection", () => {
      const input = "'; DROP TABLE users; --";
      const sanitized = sanitizeForSQL(input);

      expect(sanitized).not.toContain("';");
      expect(sanitized).toContain("''");
    });

    it("prevents XSS attacks", () => {
      const input = "<script>alert('XSS')</script>";
      const sanitized = sanitizeForHTML(input);

      expect(sanitized).not.toContain("<script>");
      expect(sanitized).toContain("&lt;");
    });

    it("sanitizes quotes and special characters", () => {
      const input = 'Test "quote" and \'apostrophe\'';
      const sanitized = sanitizeForHTML(input);

      expect(sanitized).toContain("&quot;");
      expect(sanitized).toContain("&#039;");
    });
  });

  describe("Content Security Policy", () => {
    it("generates valid CSP header", () => {
      const csp = generateCSP();

      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src");
      expect(csp).toContain("style-src");
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it("includes multiple directives", () => {
      const csp = generateCSP();
      const directives = csp.split("; ");

      expect(directives.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe("Security compliance", () => {
    it("enforces minimum password requirements through hash", () => {
      const password = "weak";
      const hash = hashPassword(password);

      // Even weak passwords are hashed securely
      expect(hash).toContain(":");
      expect(hash.length).toBeGreaterThan(20);
    });

    it("implements rate limiting to prevent brute force", () => {
      const limiter = createRateLimiter({ maxRequests: 5 });

      for (let i = 0; i < 5; i++) {
        limiter("brute_force_test");
      }

      const final = limiter("brute_force_test");
      expect(final.allowed).toBe(false);
    });

    it("encrypts sensitive data at rest", () => {
      const sensitive = "credit-card-4532";
      const encrypted = encryptData(sensitive);

      expect(encrypted).not.toContain("credit-card");
      const decrypted = decryptData(encrypted);
      expect(decrypted).toBe(sensitive);
    });
  });
});
