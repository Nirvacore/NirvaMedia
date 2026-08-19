import { useAuth } from "@/contexts/AuthContext";
import { LogIn, LogOut, User } from "lucide-react";

export default function AuthButton() {
  const { user, authenticated, mode, loading, login, demoLogin, logout } = useAuth();

  if (loading) return null;

  if (authenticated && user) {
    return (
      <div className="px-3 py-2 rounded-xl bg-muted/40 border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground truncate">{user.name}</span>
        </div>
        <p className="text-[10px] text-muted-foreground truncate mb-2">{user.email}</p>
        <button
          onClick={() => logout()}
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-red-600 transition-colors"
        >
          <LogOut className="w-3 h-3" />
          ออกจากระบบ
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {mode === "oauth" ? (
        <button
          onClick={login}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-[11px] font-medium"
        >
          <LogIn className="w-3.5 h-3.5" />
          เข้าสู่ระบบ
        </button>
      ) : (
        <button
          onClick={() => demoLogin()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium"
        >
          <LogIn className="w-3.5 h-3.5" />
          Demo Login
        </button>
      )}
    </div>
  );
}
