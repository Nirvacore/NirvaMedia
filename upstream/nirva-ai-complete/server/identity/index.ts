/**
 * NID Identity Platform — users, organizations, teams, memberships, API keys.
 * Phase 1 implementation of docs/NID_IDENTITY_ARCHITECTURE.md.
 *
 * Every table carries the standard column set (version, status, soft delete,
 * created/updated audit fields) and every mutation appends to audit_logs.
 */

import crypto from "node:crypto";
import { Router, type Request, type Response } from "express";
import { getDb, appendAuditLog } from "../db/index.ts";
import { getSessionFromRequest } from "../auth/index.ts";
import { seedTenantsIfEmpty } from "../tenants/index.ts";
import {
  checkAccess,
  isIdentityRole,
  type ApiKeySummary,
  type IdentityUser,
  type Membership,
  type Organization,
  type Team,
} from "../../shared/identity.ts";
import type { UserRole } from "../../shared/permissions.ts";
import type { TenantPlan } from "../../shared/tenants.ts";

const STANDARD_COLUMNS = `
  status TEXT NOT NULL DEFAULT 'active',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT NOT NULL DEFAULT 'system',
  updated_by TEXT NOT NULL DEFAULT 'system',
  deleted_at TEXT
`;

let schemaReady = false;

export function ensureIdentitySchema() {
  const db = getDb();
  if (schemaReady) return db;

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      avatar_url TEXT,
      locale TEXT NOT NULL DEFAULT 'th',
      timezone TEXT NOT NULL DEFAULT 'Asia/Bangkok',
      auth_provider TEXT NOT NULL DEFAULT 'demo',
      provider_id TEXT,
      ${STANDARD_COLUMNS}
    );

    CREATE INDEX IF NOT EXISTS idx_users_provider ON users(auth_provider, provider_id);

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      plan TEXT NOT NULL DEFAULT 'free',
      owner_user_id TEXT REFERENCES users(id),
      settings TEXT NOT NULL DEFAULT '{}',
      ${STANDARD_COLUMNS}
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      ${STANDARD_COLUMNS},
      UNIQUE (organization_id, slug)
    );

    CREATE TABLE IF NOT EXISTS memberships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      team_id TEXT REFERENCES teams(id),
      role TEXT NOT NULL DEFAULT 'viewer',
      ${STANDARD_COLUMNS},
      UNIQUE (user_id, organization_id, team_id)
    );

    CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
    CREATE INDEX IF NOT EXISTS idx_memberships_org ON memberships(organization_id);

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      scopes TEXT NOT NULL DEFAULT '[]',
      last_used_at TEXT,
      expires_at TEXT,
      ${STANDARD_COLUMNS}
    );

    CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id);
  `);

  // Backfill: existing tenants become organizations (same ids, idempotent).
  seedTenantsIfEmpty();
  db.exec(`
    INSERT OR IGNORE INTO organizations (id, name, slug, plan, created_by, updated_by)
    SELECT id, name, slug, plan, 'migration', 'migration' FROM tenants
  `);

  schemaReady = true;
  return db;
}

/** Test hook — force schema/backfill to run again on next call. */
export function resetIdentitySchemaCache() {
  schemaReady = false;
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${crypto.randomBytes(5).toString("hex")}`;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  locale: string;
  timezone: string;
  auth_provider: string;
  provider_id: string | null;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

function rowToUser(row: UserRow): IdentityUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    locale: row.locale,
    timezone: row.timezone,
    authProvider: row.auth_provider,
    providerId: row.provider_id,
    status: row.status as IdentityUser["status"],
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getUser(id: string): IdentityUser | null {
  const row = ensureIdentitySchema()
    .prepare("SELECT * FROM users WHERE id = ? AND deleted_at IS NULL")
    .get(id) as UserRow | undefined;
  return row ? rowToUser(row) : null;
}

export function getOrCreateUser(data: {
  email: string;
  name: string;
  provider: string;
  providerId?: string;
}): IdentityUser {
  const db = ensureIdentitySchema();
  const existing = db
    .prepare("SELECT * FROM users WHERE email = ? AND deleted_at IS NULL")
    .get(data.email) as UserRow | undefined;
  if (existing) return rowToUser(existing);

  const id = newId("usr");
  db.prepare(`
    INSERT INTO users (id, email, name, auth_provider, provider_id, created_by, updated_by)
    VALUES (@id, @email, @name, @provider, @provider_id, @id, @id)
  `).run({ id, email: data.email, name: data.name, provider: data.provider, provider_id: data.providerId ?? null });
  appendAuditLog({ action: "identity.user.create", actor: id, resource: `user:${id}`, detail: data.email });
  return getUser(id)!;
}

export function updateUser(
  id: string,
  updates: Partial<Pick<IdentityUser, "name" | "avatarUrl" | "locale" | "timezone">>,
  actor: string
): IdentityUser | null {
  const db = ensureIdentitySchema();
  const fields: string[] = [];
  const values: Record<string, unknown> = { id, actor };
  if (updates.name !== undefined) { fields.push("name = @name"); values.name = updates.name; }
  if (updates.avatarUrl !== undefined) { fields.push("avatar_url = @avatar_url"); values.avatar_url = updates.avatarUrl; }
  if (updates.locale !== undefined) { fields.push("locale = @locale"); values.locale = updates.locale; }
  if (updates.timezone !== undefined) { fields.push("timezone = @timezone"); values.timezone = updates.timezone; }
  if (fields.length === 0) return getUser(id);

  fields.push("version = version + 1", "updated_at = datetime('now')", "updated_by = @actor");
  const result = db
    .prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = @id AND deleted_at IS NULL`)
    .run(values);
  if (result.changes === 0) return null;
  appendAuditLog({ action: "identity.user.update", actor, resource: `user:${id}` });
  return getUser(id);
}

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  owner_user_id: string | null;
  settings: string;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

function rowToOrg(row: OrgRow): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan as TenantPlan,
    ownerUserId: row.owner_user_id,
    settings: JSON.parse(row.settings) as Record<string, unknown>,
    status: row.status as Organization["status"],
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getOrganization(id: string): Organization | null {
  const row = ensureIdentitySchema()
    .prepare("SELECT * FROM organizations WHERE id = ? AND deleted_at IS NULL")
    .get(id) as OrgRow | undefined;
  return row ? rowToOrg(row) : null;
}

export function createOrganization(data: {
  name: string;
  slug: string;
  plan?: TenantPlan;
  ownerUserId: string;
}): Organization {
  const db = ensureIdentitySchema();
  const id = newId("org");
  const create = db.transaction(() => {
    db.prepare(`
      INSERT INTO organizations (id, name, slug, plan, owner_user_id, created_by, updated_by)
      VALUES (@id, @name, @slug, @plan, @owner, @owner, @owner)
    `).run({ id, name: data.name, slug: data.slug, plan: data.plan ?? "free", owner: data.ownerUserId });
    db.prepare(`
      INSERT INTO memberships (id, user_id, organization_id, role, created_by, updated_by)
      VALUES (@mid, @user, @org, 'admin', @user, @user)
    `).run({ mid: newId("mem"), user: data.ownerUserId, org: id });
  });
  create();
  appendAuditLog({ action: "identity.org.create", actor: data.ownerUserId, resource: `org:${id}`, detail: data.slug });
  return getOrganization(id)!;
}

export function softDeleteOrganization(id: string, actor: string): boolean {
  const db = ensureIdentitySchema();
  const result = db.prepare(`
    UPDATE organizations
    SET status = 'deleted', deleted_at = datetime('now'), updated_at = datetime('now'),
        updated_by = @actor, version = version + 1
    WHERE id = @id AND deleted_at IS NULL
  `).run({ id, actor });
  if (result.changes === 0) return false;
  appendAuditLog({ action: "identity.org.delete", actor, resource: `org:${id}`, severity: "warning" });
  return true;
}

interface MembershipRow {
  id: string;
  user_id: string;
  organization_id: string;
  team_id: string | null;
  role: string;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

function rowToMembership(row: MembershipRow): Membership {
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    teamId: row.team_id,
    role: row.role as UserRole,
    status: row.status as Membership["status"],
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Org-level role for a user (team memberships don't widen org access). */
export function getMemberRole(userId: string, organizationId: string): UserRole | null {
  const row = ensureIdentitySchema().prepare(`
    SELECT role FROM memberships
    WHERE user_id = ? AND organization_id = ? AND team_id IS NULL AND deleted_at IS NULL
  `).get(userId, organizationId) as { role: string } | undefined;
  return row && isIdentityRole(row.role) ? row.role : null;
}

export function listMembers(organizationId: string): Membership[] {
  const rows = ensureIdentitySchema().prepare(`
    SELECT * FROM memberships
    WHERE organization_id = ? AND deleted_at IS NULL ORDER BY created_at ASC
  `).all(organizationId) as MembershipRow[];
  return rows.map(rowToMembership);
}

export function listUserMemberships(userId: string): Membership[] {
  const rows = ensureIdentitySchema().prepare(`
    SELECT * FROM memberships WHERE user_id = ? AND deleted_at IS NULL
  `).all(userId) as MembershipRow[];
  return rows.map(rowToMembership);
}

export function addMember(data: {
  userId: string;
  organizationId: string;
  role: UserRole;
  teamId?: string;
  actor: string;
}): Membership {
  const db = ensureIdentitySchema();
  const id = newId("mem");
  db.prepare(`
    INSERT INTO memberships (id, user_id, organization_id, team_id, role, created_by, updated_by)
    VALUES (@id, @user, @org, @team, @role, @actor, @actor)
  `).run({ id, user: data.userId, org: data.organizationId, team: data.teamId ?? null, role: data.role, actor: data.actor });
  appendAuditLog({
    action: "identity.member.add",
    actor: data.actor,
    resource: `org:${data.organizationId}`,
    detail: `${data.userId} as ${data.role}`,
  });
  const row = db.prepare("SELECT * FROM memberships WHERE id = ?").get(id) as MembershipRow;
  return rowToMembership(row);
}

export function updateMemberRole(
  userId: string,
  organizationId: string,
  role: UserRole,
  actor: string
): Membership | null {
  const db = ensureIdentitySchema();
  const result = db.prepare(`
    UPDATE memberships
    SET role = @role, version = version + 1, updated_at = datetime('now'), updated_by = @actor
    WHERE user_id = @user AND organization_id = @org AND team_id IS NULL AND deleted_at IS NULL
  `).run({ role, user: userId, org: organizationId, actor });
  if (result.changes === 0) return null;
  appendAuditLog({
    action: "identity.member.role",
    actor,
    resource: `org:${organizationId}`,
    detail: `${userId} -> ${role}`,
  });
  const row = db.prepare(`
    SELECT * FROM memberships
    WHERE user_id = ? AND organization_id = ? AND team_id IS NULL AND deleted_at IS NULL
  `).get(userId, organizationId) as MembershipRow;
  return rowToMembership(row);
}

export function removeMember(userId: string, organizationId: string, actor: string): boolean {
  const result = ensureIdentitySchema().prepare(`
    UPDATE memberships
    SET status = 'deleted', deleted_at = datetime('now'), updated_at = datetime('now'),
        updated_by = @actor, version = version + 1
    WHERE user_id = @user AND organization_id = @org AND deleted_at IS NULL
  `).run({ user: userId, org: organizationId, actor });
  if (result.changes === 0) return false;
  appendAuditLog({
    action: "identity.member.remove",
    actor,
    resource: `org:${organizationId}`,
    detail: userId,
    severity: "warning",
  });
  return true;
}

interface TeamRow {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

function rowToTeam(row: TeamRow): Team {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    slug: row.slug,
    status: row.status as Team["status"],
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createTeam(data: { organizationId: string; name: string; slug: string; actor: string }): Team {
  const db = ensureIdentitySchema();
  const id = newId("team");
  db.prepare(`
    INSERT INTO teams (id, organization_id, name, slug, created_by, updated_by)
    VALUES (@id, @org, @name, @slug, @actor, @actor)
  `).run({ id, org: data.organizationId, name: data.name, slug: data.slug, actor: data.actor });
  appendAuditLog({ action: "identity.team.create", actor: data.actor, resource: `org:${data.organizationId}`, detail: data.slug });
  const row = db.prepare("SELECT * FROM teams WHERE id = ?").get(id) as TeamRow;
  return rowToTeam(row);
}

export function listTeams(organizationId: string): Team[] {
  const rows = ensureIdentitySchema().prepare(`
    SELECT * FROM teams WHERE organization_id = ? AND deleted_at IS NULL ORDER BY created_at ASC
  `).all(organizationId) as TeamRow[];
  return rows.map(rowToTeam);
}

interface ApiKeyRow {
  id: string;
  organization_id: string;
  user_id: string;
  name: string;
  scopes: string;
  last_used_at: string | null;
  expires_at: string | null;
  status: string;
  created_at: string;
}

function rowToApiKey(row: ApiKeyRow): ApiKeySummary {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    name: row.name,
    scopes: JSON.parse(row.scopes) as string[],
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    status: row.status as ApiKeySummary["status"],
    createdAt: row.created_at,
  };
}

function hashKey(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex");
}

/** Returns the plaintext key exactly once; only the hash is stored. */
export function issueApiKey(data: {
  organizationId: string;
  userId: string;
  name: string;
  scopes?: string[];
  expiresAt?: string;
}): { key: string; summary: ApiKeySummary } {
  const db = ensureIdentitySchema();
  const id = newId("key");
  const plaintext = `nid_${crypto.randomBytes(24).toString("hex")}`;
  db.prepare(`
    INSERT INTO api_keys (id, organization_id, user_id, name, key_hash, scopes, expires_at, created_by, updated_by)
    VALUES (@id, @org, @user, @name, @hash, @scopes, @expires, @user, @user)
  `).run({
    id,
    org: data.organizationId,
    user: data.userId,
    name: data.name,
    hash: hashKey(plaintext),
    scopes: JSON.stringify(data.scopes ?? []),
    expires: data.expiresAt ?? null,
  });
  appendAuditLog({ action: "identity.key.issue", actor: data.userId, resource: `org:${data.organizationId}`, detail: data.name });
  const row = db.prepare("SELECT * FROM api_keys WHERE id = ?").get(id) as ApiKeyRow;
  return { key: plaintext, summary: rowToApiKey(row) };
}

export function verifyApiKey(plaintext: string): ApiKeySummary | null {
  const db = ensureIdentitySchema();
  const row = db.prepare(`
    SELECT * FROM api_keys WHERE key_hash = ? AND deleted_at IS NULL AND status = 'active'
  `).get(hashKey(plaintext)) as ApiKeyRow | undefined;
  if (!row) return null;
  if (row.expires_at && new Date(row.expires_at) < new Date()) return null;
  db.prepare("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?").run(row.id);
  return rowToApiKey(row);
}

export function listApiKeys(organizationId: string): ApiKeySummary[] {
  const rows = ensureIdentitySchema().prepare(`
    SELECT * FROM api_keys WHERE organization_id = ? AND deleted_at IS NULL ORDER BY created_at DESC
  `).all(organizationId) as ApiKeyRow[];
  return rows.map(rowToApiKey);
}

export function revokeApiKey(id: string, actor: string): boolean {
  const result = ensureIdentitySchema().prepare(`
    UPDATE api_keys
    SET status = 'deleted', deleted_at = datetime('now'), updated_at = datetime('now'),
        updated_by = @actor, version = version + 1
    WHERE id = @id AND deleted_at IS NULL
  `).run({ id, actor });
  if (result.changes === 0) return false;
  appendAuditLog({ action: "identity.key.revoke", actor, resource: `key:${id}`, severity: "warning" });
  return true;
}

// ---------------------------------------------------------------------------
// HTTP API — /api/v1/identity/*
// ---------------------------------------------------------------------------

function fail(res: Response, status: number, code: string, message: string) {
  res.status(status).json({ error: { code, message } });
}

/** Resolve the calling user from the session cookie, creating the user row on first sight. */
function resolveUser(req: Request): IdentityUser | null {
  const session = getSessionFromRequest(req);
  if (!session) return null;
  return getOrCreateUser({
    email: session.email || `${session.id}@nirva.local`,
    name: session.name || "Nirva User",
    provider: session.provider,
    providerId: session.id,
  });
}

function requireOrgRole(res: Response, userId: string, orgId: string, action: string): boolean {
  const role = getMemberRole(userId, orgId);
  const verdict = checkAccess(role, action);
  if (!verdict.allowed) {
    fail(res, 403, "NID-403-ROLE", verdict.reason || "Forbidden");
    return false;
  }
  return true;
}

export function createIdentityRouter(): Router {
  const router = Router();

  router.use((req, res, next) => {
    ensureIdentitySchema();
    const user = resolveUser(req);
    if (!user) {
      fail(res, 401, "NID-401-AUTH", "Authentication required");
      return;
    }
    (req as Request & { identityUser: IdentityUser }).identityUser = user;
    next();
  });

  const currentUser = (req: Request): IdentityUser =>
    (req as Request & { identityUser: IdentityUser }).identityUser;

  router.get("/me", (req, res) => {
    const user = currentUser(req);
    const memberships = listUserMemberships(user.id);
    const organizations = memberships
      .filter((m) => m.teamId === null)
      .map((m) => ({ organization: getOrganization(m.organizationId), role: m.role }))
      .filter((entry) => entry.organization);
    res.json({ user, memberships, organizations });
  });

  router.get("/users/:id", (req, res) => {
    const user = getUser(req.params.id);
    if (!user) return fail(res, 404, "NID-404-USER", "User not found");
    res.json({ user });
  });

  router.patch("/users/:id", (req, res) => {
    const actor = currentUser(req);
    if (actor.id !== req.params.id) {
      return fail(res, 403, "NID-403-SELF", "Users can only update their own profile");
    }
    const { name, avatarUrl, locale, timezone } = req.body ?? {};
    const user = updateUser(req.params.id, { name, avatarUrl, locale, timezone }, actor.id);
    if (!user) return fail(res, 404, "NID-404-USER", "User not found");
    res.json({ user });
  });

  router.post("/orgs", (req, res) => {
    const actor = currentUser(req);
    const { name, slug, plan } = req.body ?? {};
    if (!name || !slug) return fail(res, 400, "NID-400-INPUT", "name and slug are required");
    try {
      const organization = createOrganization({ name, slug, plan, ownerUserId: actor.id });
      res.status(201).json({ organization });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("UNIQUE")) return fail(res, 409, "NID-409-SLUG", `Slug "${slug}" is taken`);
      throw err;
    }
  });

  router.get("/orgs/:id", (req, res) => {
    const actor = currentUser(req);
    if (!requireOrgRole(res, actor.id, req.params.id, "identity:read")) return;
    const organization = getOrganization(req.params.id);
    if (!organization) return fail(res, 404, "NID-404-ORG", "Organization not found");
    res.json({ organization });
  });

  router.delete("/orgs/:id", (req, res) => {
    const actor = currentUser(req);
    if (!requireOrgRole(res, actor.id, req.params.id, "identity:admin")) return;
    if (!softDeleteOrganization(req.params.id, actor.id)) {
      return fail(res, 404, "NID-404-ORG", "Organization not found");
    }
    res.json({ deleted: true });
  });

  router.get("/orgs/:id/members", (req, res) => {
    const actor = currentUser(req);
    if (!requireOrgRole(res, actor.id, req.params.id, "identity:read")) return;
    res.json({ members: listMembers(req.params.id) });
  });

  router.post("/orgs/:id/members", (req, res) => {
    const actor = currentUser(req);
    if (!requireOrgRole(res, actor.id, req.params.id, "identity:admin")) return;
    const { userId, role, teamId } = req.body ?? {};
    if (!userId || !role) return fail(res, 400, "NID-400-INPUT", "userId and role are required");
    if (!isIdentityRole(role)) return fail(res, 400, "NID-400-ROLE", `Unknown role "${role}"`);
    if (!getUser(userId)) return fail(res, 404, "NID-404-USER", "User not found");
    const membership = addMember({ userId, organizationId: req.params.id, role, teamId, actor: actor.id });
    res.status(201).json({ membership });
  });

  router.patch("/orgs/:id/members/:userId", (req, res) => {
    const actor = currentUser(req);
    if (!requireOrgRole(res, actor.id, req.params.id, "identity:admin")) return;
    const { role } = req.body ?? {};
    if (!role || !isIdentityRole(role)) return fail(res, 400, "NID-400-ROLE", `Unknown role "${role}"`);
    const membership = updateMemberRole(req.params.userId, req.params.id, role, actor.id);
    if (!membership) return fail(res, 404, "NID-404-MEMBER", "Membership not found");
    res.json({ membership });
  });

  router.delete("/orgs/:id/members/:userId", (req, res) => {
    const actor = currentUser(req);
    if (!requireOrgRole(res, actor.id, req.params.id, "identity:admin")) return;
    if (!removeMember(req.params.userId, req.params.id, actor.id)) {
      return fail(res, 404, "NID-404-MEMBER", "Membership not found");
    }
    res.json({ removed: true });
  });

  router.post("/orgs/:id/teams", (req, res) => {
    const actor = currentUser(req);
    if (!requireOrgRole(res, actor.id, req.params.id, "identity:write")) return;
    const { name, slug } = req.body ?? {};
    if (!name || !slug) return fail(res, 400, "NID-400-INPUT", "name and slug are required");
    try {
      const team = createTeam({ organizationId: req.params.id, name, slug, actor: actor.id });
      res.status(201).json({ team });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("UNIQUE")) return fail(res, 409, "NID-409-SLUG", `Team slug "${slug}" is taken`);
      throw err;
    }
  });

  router.get("/orgs/:id/teams", (req, res) => {
    const actor = currentUser(req);
    if (!requireOrgRole(res, actor.id, req.params.id, "identity:read")) return;
    res.json({ teams: listTeams(req.params.id) });
  });

  router.post("/keys", (req, res) => {
    const actor = currentUser(req);
    const { organizationId, name, scopes, expiresAt } = req.body ?? {};
    if (!organizationId || !name) return fail(res, 400, "NID-400-INPUT", "organizationId and name are required");
    if (!requireOrgRole(res, actor.id, organizationId, "identity:admin")) return;
    const { key, summary } = issueApiKey({ organizationId, userId: actor.id, name, scopes, expiresAt });
    res.status(201).json({ key, apiKey: summary });
  });

  router.get("/keys", (req, res) => {
    const actor = currentUser(req);
    const organizationId = String(req.query.organizationId || "");
    if (!organizationId) return fail(res, 400, "NID-400-INPUT", "organizationId query param is required");
    if (!requireOrgRole(res, actor.id, organizationId, "identity:read")) return;
    res.json({ apiKeys: listApiKeys(organizationId) });
  });

  router.delete("/keys/:id", (req, res) => {
    const actor = currentUser(req);
    const keys = ensureIdentitySchema()
      .prepare("SELECT organization_id FROM api_keys WHERE id = ? AND deleted_at IS NULL")
      .get(req.params.id) as { organization_id: string } | undefined;
    if (!keys) return fail(res, 404, "NID-404-KEY", "API key not found");
    if (!requireOrgRole(res, actor.id, keys.organization_id, "identity:admin")) return;
    revokeApiKey(req.params.id, actor.id);
    res.json({ revoked: true });
  });

  router.post("/authz/check", (req, res) => {
    const actor = currentUser(req);
    const { userId, organizationId, action } = req.body ?? {};
    if (!organizationId || !action) {
      return fail(res, 400, "NID-400-INPUT", "organizationId and action are required");
    }
    const subject = userId || actor.id;
    // Inspecting another user's permissions requires read access to the org.
    if (subject !== actor.id && !requireOrgRole(res, actor.id, organizationId, "identity:read")) return;
    const role = getMemberRole(subject, organizationId);
    const verdict = checkAccess(role, action);
    res.json({ userId: subject, organizationId, action, role, ...verdict });
  });

  return router;
}
