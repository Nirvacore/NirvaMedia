import { useTenant } from "@/contexts/TenantContext";
import { Building2, ChevronDown } from "lucide-react";
import { useState } from "react";

const planBadge: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  pro: "bg-amber-50 text-amber-700",
  enterprise: "bg-primary/10 text-primary",
  impact: "bg-green-50 text-green-700",
};

export default function TenantSwitcher() {
  const { tenants, current, switchTenant, loading } = useTenant();
  const [open, setOpen] = useState(false);

  if (loading || !current) return null;

  return (
    <div className="relative px-3 mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card/50 hover:bg-muted/40 transition-colors text-left"
      >
        <Building2 className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-xs font-semibold text-foreground truncate">{current.name}</p>
          <p className="text-[10px] text-muted-foreground">{current.agentCount ?? 0} agents</p>
        </div>
        <ChevronDown className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
      </button>
      {open && (
        <div className="absolute bottom-full left-3 right-3 mb-2 bg-card border border-border rounded-xl shadow-lg py-2 z-[100] max-h-48 overflow-y-auto">
          {tenants.map((t) => (
            <button
              key={t.id}
              onClick={() => { setOpen(false); if (t.id !== current.id) switchTenant(t.id); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center justify-between gap-2 ${
                t.id === current.id ? "bg-primary/5" : ""
              }`}
            >
              <span className="font-medium truncate">{t.name}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${planBadge[t.plan] ?? planBadge.free}`}>
                {t.plan}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
