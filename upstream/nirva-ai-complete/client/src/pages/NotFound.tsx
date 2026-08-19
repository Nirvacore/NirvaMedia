import Sidebar from "@/components/Sidebar";
import { Leaf, LayoutDashboard, Users, Compass } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function NotFound() {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          {/* Brand-aligned mark */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-primary/10 blur-xl" />
              <div className="relative w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Compass className="w-9 h-9 text-primary" />
                <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-2xl bg-card border border-border flex items-center justify-center shadow-sm">
                  <Leaf className="w-4 h-4 text-primary" />
                </div>
              </div>
            </div>
          </div>

          <p className="text-[64px] leading-none font-bold tracking-tight text-foreground">404</p>

          <h1 className="mt-3 text-xl font-semibold text-foreground">
            This path isn't in the garden
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The page you're looking for has wandered off or never grew here. Let's
            guide you back to familiar ground.
          </p>

          {location && location !== "/" && (
            <div className="mt-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-muted/40 border border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <code className="text-xs font-mono text-muted-foreground">{location}</code>
            </div>
          )}

          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-medium shadow-sm transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:shadow-lg active:scale-95">
                <LayoutDashboard className="w-4 h-4" />
                Back to Dashboard
              </button>
            </Link>
            <Link href="/agents">
              <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-card text-foreground text-sm font-medium border border-border transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md active:scale-95">
                <Users className="w-4 h-4 text-primary" />
                Explore Agents
              </button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
