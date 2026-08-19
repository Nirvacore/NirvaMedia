import { describe, it, expect, beforeEach } from "vitest";
import { isOAuthConfigured, getOAuthCallbackPath, buildLoginUrl } from "../auth/index.ts";
import { createSession, getSession, deleteSession, getDb } from "../db/index.ts";

describe("auth", () => {
  beforeEach(() => {
    delete process.env.VITE_OAUTH_PORTAL_URL;
    delete process.env.VITE_APP_ID;
    delete process.env.OAUTH_PORTAL_URL;
    delete process.env.OAUTH_APP_ID;
  });

  it("reports oauth not configured without env vars", () => {
    expect(isOAuthConfigured()).toBe(false);
  });

  it("reports oauth configured with portal + app id", () => {
    process.env.VITE_OAUTH_PORTAL_URL = "https://auth.example.com";
    process.env.VITE_APP_ID = "nirva-dashboard";
    expect(isOAuthConfigured()).toBe(true);
  });

  it("uses Manus callback path for ai.nirva.one", () => {
    process.env.OAUTH_CALLBACK_PATH = "/manus-oauth/callback";
    process.env.PUBLIC_URL = "https://ai.nirva.one";
    process.env.VITE_OAUTH_PORTAL_URL = "https://manus.im";
    process.env.VITE_APP_ID = "c94nssM6mCHuLojjUFdQbn";
    expect(getOAuthCallbackPath()).toBe("/manus-oauth/callback");
    const url = buildLoginUrl("https://ai.nirva.one");
    expect(url).toContain("manus.im");
    expect(url).toContain("redirectUri=https%3A%2F%2Fai.nirva.one%2Fmanus-oauth%2Fcallback");
    delete process.env.OAUTH_CALLBACK_PATH;
    delete process.env.PUBLIC_URL;
  });

  it("creates and retrieves sessions", () => {
    getDb(); // ensure schema
    const session = createSession({
      userId: "test_user",
      email: "test@nirva.local",
      name: "Test User",
      provider: "demo",
    });
    expect(session.id).toMatch(/^sess_/);
    const loaded = getSession(session.id);
    expect(loaded?.email).toBe("test@nirva.local");
    deleteSession(session.id);
    expect(getSession(session.id)).toBeNull();
  });
});
