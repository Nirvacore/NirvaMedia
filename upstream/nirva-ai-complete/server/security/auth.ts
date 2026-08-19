/**
 * NMD Authentication & Authorization
 * JWT-based auth with role-based access control (RBAC)
 */

import crypto from "node:crypto";

export interface TokenPayload {
  userId: string;
  organizationId: string;
  role: "admin" | "manager" | "editor" | "viewer";
  permissions: string[];
  iat: number;
  exp: number;
}

export interface User {
  id: string;
  email: string;
  organizationId: string;
  role: TokenPayload["role"];
  isActive: boolean;
  mfaEnabled: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface AuthContext {
  userId: string;
  organizationId: string;
  role: string;
  permissions: string[];
  isAuthenticated: boolean;
}

// Role-based permissions matrix
const rolePermissions: Record<string, string[]> = {
  admin: [
    "content.create",
    "content.edit",
    "content.delete",
    "content.publish",
    "templates.manage",
    "metrics.manage",
    "webhooks.manage",
    "users.manage",
    "organization.configure",
    "audit.view",
  ],
  manager: [
    "content.create",
    "content.edit",
    "content.publish",
    "templates.create",
    "metrics.view",
    "webhooks.view",
    "team.manage",
    "reports.view",
  ],
  editor: [
    "content.create",
    "content.edit",
    "content.view",
    "templates.view",
    "metrics.view",
    "comments.add",
  ],
  viewer: ["content.view", "metrics.view", "reports.view", "comments.view"],
};

const jwtSecret = process.env.JWT_SECRET || "change-me-in-production";
const jwtExpiry = process.env.JWT_EXPIRY || "7d";

/**
 * Generate JWT token
 */
export function generateToken(user: User, permissions: string[]): string {
  const payload: TokenPayload = {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
    permissions,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + parseDuration(jwtExpiry),
  };

  // Simplified JWT encoding (in production, use a proper JWT library)
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");

  const signature = crypto
    .createHmac("sha256", jwtSecret)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const [headerB64, bodyB64, signatureB64] = token.split(".");

    const signature = crypto
      .createHmac("sha256", jwtSecret)
      .update(`${headerB64}.${bodyB64}`)
      .digest("base64url");

    if (signature !== signatureB64) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(bodyB64, "base64url").toString()) as TokenPayload;

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1];
}

/**
 * Check if user has required permission
 */
export function hasPermission(permissions: string[], required: string): boolean {
  return permissions.includes(required) || permissions.includes("*");
}

/**
 * Check if user has any of the required roles
 */
export function hasRole(role: string, required: string[]): boolean {
  return required.includes(role);
}

/**
 * Get permissions for a role
 */
export function getPermissionsForRole(role: string): string[] {
  return rolePermissions[role] || [];
}

/**
 * Hash password using bcrypt-like approach
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify password
 */
export function verifyPassword(password: string, hash: string): boolean {
  const [salt, stored] = hash.split(":");
  const verify = crypto.pbkdf2Sync(password, salt, 10000, 32, "sha256").toString("hex");
  return verify === stored;
}

/**
 * Encrypt sensitive data
 */
export function encryptData(data: string): string {
  const iv = crypto.randomBytes(16);
  const encryptionKey = crypto.scryptSync(jwtSecret, "salt", 32);

  const cipher = crypto.createCipheriv("aes-256-cbc", encryptionKey, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 */
export function decryptData(encrypted: string): string | null {
  try {
    const [ivHex, encryptedData] = encrypted.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encryptionKey = crypto.scryptSync(jwtSecret, "salt", 32);

    const decipher = crypto.createDecipheriv("aes-256-cbc", encryptionKey, iv);
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch {
    return null;
  }
}

/**
 * Parse duration string (e.g., "7d", "24h")
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60; // Default to 7 days

  const value = parseInt(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };

  return value * (multipliers[unit] || 1);
}

/**
 * Generate API key for service-to-service auth
 */
export function generateApiKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash API key for storage
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

/**
 * Verify API key
 */
export function verifyApiKey(apiKey: string, hash: string): boolean {
  const computed = crypto.createHash("sha256").update(apiKey).digest("hex");
  return computed === hash;
}
