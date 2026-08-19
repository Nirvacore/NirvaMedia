import type { Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.ts";
import {
  createSession,
  getSession,
  deleteSession,
  type AuthUser,
} from "../db/index.ts";

const OAUTH_PORTAL_URL = () => process.env.VITE_OAUTH_PORTAL_URL || process.env.OAUTH_PORTAL_URL || "";
const OAUTH_APP_ID = () => process.env.VITE_APP_ID || process.env.OAUTH_APP_ID || "";

/** Manus Space uses /manus-oauth/callback; self-hosted uses /api/oauth/callback */
export function getOAuthCallbackPath(): string {
  return process.env.OAUTH_CALLBACK_PATH || "/api/oauth/callback";
}

export function getPublicOrigin(req?: Request): string {
  const configured = process.env.PUBLIC_URL || process.env.VITE_PUBLIC_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (req) {
    const proto = req.get("x-forwarded-proto") || req.protocol;
    const host = req.get("x-forwarded-host") || req.get("host");
    if (host) return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}

export function getOAuthRedirectUri(req?: Request): string {
  return `${getPublicOrigin(req)}${getOAuthCallbackPath()}`;
}

export function isOAuthConfigured(): boolean {
  return Boolean(OAUTH_PORTAL_URL() && OAUTH_APP_ID());
}

export function buildLoginUrl(originOrReq?: string | Request): string {
  const redirectUri = typeof originOrReq === "object" && originOrReq
    ? getOAuthRedirectUri(originOrReq)
    : `${(originOrReq || getPublicOrigin()).replace(/\/$/, "")}${getOAuthCallbackPath()}`;
  const state = Buffer.from(redirectUri).toString("base64url");
  const url = new URL(`${OAUTH_PORTAL_URL().replace(/\/$/, "")}/app-auth`);
  url.searchParams.set("appId", OAUTH_APP_ID());
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("responseType", "code");
  url.searchParams.set("type", "signIn");
  return url.toString();
}

export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header.split(";").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, decodeURIComponent(rest.join("=") || "")];
    }).filter(([key]) => key)
  );
}

export function setSessionCookie(res: Response, sessionId: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(ONE_YEAR_MS / 1000)}${secure}`
  );
}

export function clearSessionCookie(res: Response) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`);
}

export function getSessionFromRequest(req: Request): AuthUser | null {
  const cookies = parseCookies(req);
  const sessionId = cookies[COOKIE_NAME];
  if (!sessionId) return null;
  const session = getSession(sessionId);
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) {
    deleteSession(sessionId);
    return null;
  }
  return {
    id: session.userId,
    email: session.email,
    name: session.name,
    provider: session.provider,
  };
}

export async function handleOAuthCallback(req: Request, res: Response) {
  const { code, token, email, name, error } = req.query;

  if (error) {
    res.redirect(`/?auth_error=${encodeURIComponent(String(error))}`);
    return;
  }

  let userEmail = email ? String(email) : "";
  let userName = name ? String(name) : "";
  let provider = "oauth";

  if (token) {
    // Direct token from portal
    userEmail = userEmail || `user@${OAUTH_APP_ID()}.nirva.local`;
    userName = userName || "Nirva User";
  } else if (code && isOAuthConfigured()) {
    try {
      const tokenRes = await fetch(`${OAUTH_PORTAL_URL().replace(/\/$/, "")}/api/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: String(code),
          appId: OAUTH_APP_ID(),
          redirectUri: getOAuthRedirectUri(req),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (tokenRes.ok) {
        const data = (await tokenRes.json()) as { email?: string; name?: string };
        userEmail = data.email || userEmail;
        userName = data.name || userName;
      }
    } catch {
      // Fall through with defaults
    }
    userEmail = userEmail || `user@${OAUTH_APP_ID()}.nirva.local`;
    userName = userName || "Nirva User";
  } else {
    res.redirect("/?auth_error=missing_credentials");
    return;
  }

  const session = createSession({
    userId: `user_${Date.now()}`,
    email: userEmail,
    name: userName,
    provider,
  });

  setSessionCookie(res, session.id);
  res.redirect("/?auth=success");
}

export function handleDemoLogin(req: Request, res: Response) {
  const { name = "Demo User", email = "demo@nirva.local" } = req.body ?? {};
  const session = createSession({
    userId: `demo_${Date.now()}`,
    email: String(email),
    name: String(name),
    provider: "demo",
  });
  setSessionCookie(res, session.id);
  res.json({
    user: { id: session.userId, email: session.email, name: session.name, provider: "demo" },
  });
}

export function handleLogout(req: Request, res: Response) {
  const cookies = parseCookies(req);
  if (cookies[COOKIE_NAME]) deleteSession(cookies[COOKIE_NAME]);
  clearSessionCookie(res);
  res.json({ ok: true });
}
