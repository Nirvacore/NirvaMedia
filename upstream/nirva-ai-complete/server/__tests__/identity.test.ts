import { describe, it, expect, beforeAll } from "vitest";
import { getDb, listAuditLogs } from "../db/index.ts";
import {
  ensureIdentitySchema,
  getOrCreateUser,
  getUser,
  updateUser,
  createOrganization,
  getOrganization,
  softDeleteOrganization,
  getMemberRole,
  addMember,
  updateMemberRole,
  removeMember,
  listMembers,
  createTeam,
  listTeams,
  issueApiKey,
  verifyApiKey,
  listApiKeys,
  revokeApiKey,
} from "../identity/index.ts";
import { checkAccess, actionToLevel } from "../../shared/identity.ts";

const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

describe("NID identity", () => {
  beforeAll(() => {
    getDb();
    ensureIdentitySchema();
  });

  it("creates a user once per email and finds it again", () => {
    const email = `owner-${stamp}@nirva.local`;
    const created = getOrCreateUser({ email, name: "Owner", provider: "demo" });
    expect(created.id).toMatch(/^usr_/);
    expect(created.locale).toBe("th");
    const again = getOrCreateUser({ email, name: "Renamed", provider: "demo" });
    expect(again.id).toBe(created.id);
    expect(getUser(created.id)?.email).toBe(email);
  });

  it("updates a user profile and bumps the version", () => {
    const user = getOrCreateUser({ email: `patch-${stamp}@nirva.local`, name: "Before", provider: "demo" });
    const updated = updateUser(user.id, { name: "After", locale: "en" }, user.id);
    expect(updated?.name).toBe("After");
    expect(updated?.locale).toBe("en");
    expect(updated?.version).toBe(user.version + 1);
  });

  it("creates an organization with the owner as admin", () => {
    const owner = getOrCreateUser({ email: `org-owner-${stamp}@nirva.local`, name: "Org Owner", provider: "demo" });
    const org = createOrganization({ name: "Test Org", slug: `test-org-${stamp}`, ownerUserId: owner.id });
    expect(org.id).toMatch(/^org_/);
    expect(org.ownerUserId).toBe(owner.id);
    expect(getMemberRole(owner.id, org.id)).toBe("admin");
  });

  it("backfills existing tenants as organizations", () => {
    expect(getOrganization("tenant_nirva_default")?.slug).toBe("nirvacore");
  });

  it("manages member roles through the RBAC matrix", () => {
    const owner = getOrCreateUser({ email: `rbac-owner-${stamp}@nirva.local`, name: "Owner", provider: "demo" });
    const viewer = getOrCreateUser({ email: `rbac-viewer-${stamp}@nirva.local`, name: "Viewer", provider: "demo" });
    const org = createOrganization({ name: "RBAC Org", slug: `rbac-org-${stamp}`, ownerUserId: owner.id });

    addMember({ userId: viewer.id, organizationId: org.id, role: "viewer", actor: owner.id });
    expect(getMemberRole(viewer.id, org.id)).toBe("viewer");
    expect(checkAccess(getMemberRole(viewer.id, org.id), "identity:read").allowed).toBe(true);
    expect(checkAccess(getMemberRole(viewer.id, org.id), "identity:write").allowed).toBe(false);

    updateMemberRole(viewer.id, org.id, "developer", owner.id);
    expect(checkAccess(getMemberRole(viewer.id, org.id), "media:deploy").allowed).toBe(true);
    expect(checkAccess(getMemberRole(viewer.id, org.id), "identity:admin").allowed).toBe(false);

    expect(removeMember(viewer.id, org.id, owner.id)).toBe(true);
    expect(getMemberRole(viewer.id, org.id)).toBeNull();
    expect(checkAccess(null, "identity:read").allowed).toBe(false);
    expect(listMembers(org.id)).toHaveLength(1);
  });

  it("rejects unknown action formats", () => {
    expect(actionToLevel("identity:read")).toBe("read");
    expect(actionToLevel("nonsense")).toBeNull();
    expect(checkAccess("admin", "identity:banana").allowed).toBe(false);
  });

  it("creates teams scoped to an organization", () => {
    const owner = getOrCreateUser({ email: `team-owner-${stamp}@nirva.local`, name: "Owner", provider: "demo" });
    const org = createOrganization({ name: "Team Org", slug: `team-org-${stamp}`, ownerUserId: owner.id });
    const team = createTeam({ organizationId: org.id, name: "Media", slug: "media", actor: owner.id });
    expect(team.organizationId).toBe(org.id);
    expect(listTeams(org.id).map((t) => t.slug)).toContain("media");
  });

  it("issues, verifies, and revokes API keys storing only hashes", () => {
    const owner = getOrCreateUser({ email: `key-owner-${stamp}@nirva.local`, name: "Owner", provider: "demo" });
    const org = createOrganization({ name: "Key Org", slug: `key-org-${stamp}`, ownerUserId: owner.id });
    const { key, summary } = issueApiKey({ organizationId: org.id, userId: owner.id, name: "ci", scopes: ["identity:read"] });

    expect(key).toMatch(/^nid_/);
    const stored = getDb().prepare("SELECT key_hash FROM api_keys WHERE id = ?").get(summary.id) as { key_hash: string };
    expect(stored.key_hash).not.toContain(key);

    expect(verifyApiKey(key)?.id).toBe(summary.id);
    expect(verifyApiKey("nid_wrong")).toBeNull();
    expect(listApiKeys(org.id).some((k) => k.id === summary.id)).toBe(true);

    expect(revokeApiKey(summary.id, owner.id)).toBe(true);
    expect(verifyApiKey(key)).toBeNull();
  });

  it("rejects expired API keys", () => {
    const owner = getOrCreateUser({ email: `exp-owner-${stamp}@nirva.local`, name: "Owner", provider: "demo" });
    const org = createOrganization({ name: "Exp Org", slug: `exp-org-${stamp}`, ownerUserId: owner.id });
    const past = new Date(Date.now() - 60_000).toISOString();
    const { key } = issueApiKey({ organizationId: org.id, userId: owner.id, name: "expired", expiresAt: past });
    expect(verifyApiKey(key)).toBeNull();
  });

  it("soft deletes organizations and hides them from reads", () => {
    const owner = getOrCreateUser({ email: `del-owner-${stamp}@nirva.local`, name: "Owner", provider: "demo" });
    const org = createOrganization({ name: "Del Org", slug: `del-org-${stamp}`, ownerUserId: owner.id });
    expect(softDeleteOrganization(org.id, owner.id)).toBe(true);
    expect(getOrganization(org.id)).toBeNull();
    expect(softDeleteOrganization(org.id, owner.id)).toBe(false);
    const raw = getDb().prepare("SELECT status, deleted_at FROM organizations WHERE id = ?").get(org.id) as { status: string; deleted_at: string };
    expect(raw.status).toBe("deleted");
    expect(raw.deleted_at).toBeTruthy();
  });

  it("writes audit logs for identity mutations", () => {
    const actions = listAuditLogs({ limit: 200 }).map((entry) => entry.action);
    for (const expected of [
      "identity.user.create",
      "identity.org.create",
      "identity.member.add",
      "identity.member.role",
      "identity.member.remove",
      "identity.team.create",
      "identity.key.issue",
      "identity.key.revoke",
      "identity.org.delete",
    ]) {
      expect(actions).toContain(expected);
    }
  });
});
