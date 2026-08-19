import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { fetchTenants, fetchCurrentTenant, type Tenant } from "@/lib/api";

const STORAGE_KEY = "nirva_tenant_id";

interface TenantState {
  tenants: Tenant[];
  current: Tenant | null;
  loading: boolean;
  switchTenant: (tenantId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const TenantContext = createContext<TenantState | null>(null);

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}

export function getStoredTenantId(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [current, setCurrent] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const storedId = getStoredTenantId();
      const [{ tenants: list }, active] = await Promise.all([
        fetchTenants(),
        fetchCurrentTenant(storedId ?? undefined),
      ]);
      setTenants(list);
      setCurrent(active);
      if (active?.id) localStorage.setItem(STORAGE_KEY, active.id);
    } catch {
      setTenants([]);
      setCurrent(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const switchTenant = useCallback(async (tenantId: string) => {
    localStorage.setItem(STORAGE_KEY, tenantId);
    document.cookie = `nirva_tenant_id=${encodeURIComponent(tenantId)};path=/;max-age=31536000;SameSite=Lax`;
    const active = await fetchCurrentTenant(tenantId);
    setCurrent(active);
    window.location.reload();
  }, []);

  return (
    <TenantContext.Provider value={{ tenants, current, loading, switchTenant, refresh }}>
      {children}
    </TenantContext.Provider>
  );
}
