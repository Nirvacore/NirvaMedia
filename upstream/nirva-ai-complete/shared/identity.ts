/**
 * NID Identity Platform — shared types & authz helpers (Phase 1).
 * Design: docs/NID_IDENTITY_ARCHITECTURE.md
 */

import { roleHasPermission, type PermissionLevel, type UserRole } from "./permissions.ts";
import type { TenantPlan } from "./tenants.ts";

export type EntityStatus = "active" | "suspended" | "invited" | "deleted";

export interface IdentityUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  locale: string;
  timezone: string;
  authProvider: string;
  providerId: string | null;
  status: EntityStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  ownerUserId: string | null;
  settings: Record<string, unknown>;
  status: EntityStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  status: EntityStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  teamId: string | null;
  role: UserRole;
  status: EntityStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeySummary {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  status: EntityStatus;
  createdAt: string;
}

export interface AuthzResult {
  allowed: boolean;
  reason?: string;
}

export const IDENTITY_ROLES: UserRole[] = ["viewer", "operator", "developer", "admin"];

export function isIdentityRole(value: string): value is UserRole {
  return (IDENTITY_ROLES as string[]).includes(value);
}

/**
 * Actions are namespaced as "<module>:<level>", e.g. "identity:read",
 * "media:write", "workflow:deploy", "identity:admin". The level suffix maps
 * onto the shared RBAC matrix so every module checks permissions the same way.
 */
export function actionToLevel(action: string): PermissionLevel | null {
  const suffix = action.split(":").pop() || "";
  if (suffix === "read" || suffix === "write" || suffix === "deploy" || suffix === "admin") {
    return suffix;
  }
  return null;
}

export function checkAccess(role: UserRole | null, action: string): AuthzResult {
  if (!role) {
    return { allowed: false, reason: "No membership in this organization" };
  }
  const level = actionToLevel(action);
  if (!level) {
    return { allowed: false, reason: `Unknown action level in "${action}"` };
  }
  if (!roleHasPermission(role, level)) {
    return { allowed: false, reason: `Role "${role}" lacks "${level}" permission` };
  }
  return { allowed: true };
}
