import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { getLoginUrl } from "@/const";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  provider: string;
}

interface AuthState {
  user: AuthUser | null;
  authenticated: boolean;
  mode: "oauth" | "demo";
  loading: boolean;
  login: () => void;
  demoLogin: (name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

async function fetchAuthMe() {
  const res = await fetch("/api/auth/me");
  if (!res.ok) throw new Error("auth check failed");
  return res.json() as Promise<{ authenticated: boolean; user: AuthUser | null; mode: "oauth" | "demo" }>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [mode, setMode] = useState<"oauth" | "demo">("demo");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchAuthMe();
      setAuthenticated(data.authenticated);
      setUser(data.user);
      setMode(data.mode);
    } catch {
      setAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "success") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [refresh]);

  const login = useCallback(() => {
    if (import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID) {
      window.location.href = getLoginUrl();
    } else {
      window.location.href = "/api/auth/login";
    }
  }, []);

  const demoLogin = useCallback(async (name = "Nirva User") => {
    const res = await fetch("/api/auth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email: "demo@nirva.local" }),
    });
    if (!res.ok) throw new Error("demo login failed");
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, authenticated, mode, loading, login, demoLogin, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
