import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LayoutDashboard, Users, Sun, Moon, Palette, Leaf, GitBranch, Mic, Globe, MessageSquare, Brain, Network, ListTodo, FolderOpen, TerminalSquare, Settings, Store, Building2, BarChart3, Puzzle, BookOpen, Sparkles, Cpu, Zap, Code2, Shield } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import LiveIndicator from "@/components/LiveIndicator";
import AuthButton from "@/components/AuthButton";
import TenantSwitcher from "@/components/TenantSwitcher";

export default function Sidebar() {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t, localeNames } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);

  const navItems = [
    { icon: LayoutDashboard, label: t.navDashboard, path: "/" },
    { icon: Sparkles, label: t.navDemo, path: "/demo" },
    { icon: Network, label: t.navEcosystem, path: "/ecosystem" },
    { icon: Building2, label: t.navOrganization, path: "/organization" },
    { icon: Shield, label: "Enterprise", path: "/enterprise" },
    { icon: Cpu, label: t.navOrchestration, path: "/orchestration" },
    { icon: Zap, label: "Brains", path: "/brains" },
    { icon: Globe, label: "Providers", path: "/providers" },
    { icon: Code2, label: "Workspace", path: "/workspace" },
    { icon: MessageSquare, label: t.navChat, path: "/chat" },
    { icon: Brain, label: t.navMemory, path: "/memory" },
    { icon: GitBranch, label: t.navWorkflows, path: "/workflows" },
    { icon: ListTodo, label: t.navTasks, path: "/tasks" },
    { icon: BarChart3, label: t.navReports, path: "/reports" },
    { icon: Mic, label: t.navVoice, path: "/voice" },
    { icon: GitBranch, label: t.navMindMap, path: "/mindmap" },
    { icon: Users, label: t.navAgents, path: "/agents" },
    { icon: Store, label: t.navMarketplace, path: "/marketplace" },
    { icon: Puzzle, label: t.navPlugins, path: "/plugins" },
    { icon: BookOpen, label: t.navDocs, path: "/docs" },
    { icon: FolderOpen, label: t.navFiles, path: "/files" },
    { icon: TerminalSquare, label: t.navTerminal, path: "/terminal" },
    { icon: Settings, label: t.navSettings, path: "/settings" },
  ];

  const languages: { code: Locale; name: string; flag: string }[] = [
    { code: "th", name: "ไทย", flag: "🇹🇭" },
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "ja", name: "日本語", flag: "🇯🇵" },
    { code: "zh", name: "中文", flag: "🇨🇳" },
    { code: "ko", name: "한국어", flag: "🇰🇷" },
    { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
    { code: "id", name: "Indonesia", flag: "🇮🇩" },
    { code: "ms", name: "Melayu", flag: "🇲🇾" },
    { code: "my", name: "မြန်မာ", flag: "🇲🇲" },
    { code: "km", name: "ខ្មែរ", flag: "🇰🇭" },
    { code: "lo", name: "ລາວ", flag: "🇱🇦" },
    { code: "tl", name: "Filipino", flag: "🇵🇭" },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "de", name: "Deutsch", flag: "🇩🇪" },
    { code: "ar", name: "العربية", flag: "🇸🇦" },
    { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-[72px] hover:w-56 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] bg-sidebar border-r border-sidebar-border flex flex-col py-6 z-50 group overflow-hidden">
      {/* Brand Mark */}
      <div className="px-4 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
          <Leaf className="w-5 h-5 text-primary" />
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
          <p className="text-sm font-bold text-foreground tracking-tight">NIRVA</p>
          <p className="text-[10px] text-muted-foreground font-medium">{t.appTagline}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 px-3 flex-1 overflow-y-auto scrollbar-thin">
        <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-medium px-3 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {t.navNavigate}
        </p>
        {navItems.map((item) => {
          const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
          return (
            <Link key={item.path} href={item.path}>
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/15 shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent"
                }`}
              >
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span className="text-[13px] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                  {item.label}
                </span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Language Switcher */}
      <div className="px-3 pt-3 border-t border-sidebar-border mx-3 relative">
        <button
          onClick={() => setShowLangMenu(!showLangMenu)}
          className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-muted-foreground hover:bg-muted/60 hover:text-foreground w-full"
        >
          <Globe className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            {languages.find(l => l.code === locale)?.flag} {localeNames[locale]}
          </span>
        </button>

        {/* Language Dropdown */}
        {showLangMenu && (
          <div className="absolute bottom-full left-3 mb-2 w-48 max-h-64 overflow-y-auto bg-card border border-border rounded-xl shadow-lg py-2 z-[100]">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLocale(lang.code);
                  setShowLangMenu(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  locale === lang.code
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-muted/60"
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Theme Switcher */}
      <div className="px-3 pt-3 border-t border-sidebar-border mx-3 mt-2">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setTheme("light")}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
              theme === "light" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <Sun className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">{t.themeLight}</span>
          </button>
          <button
            onClick={() => setTheme("pastel")}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
              theme === "pastel" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <Palette className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">{t.themePastel}</span>
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
              theme === "dark" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <Moon className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">{t.themeDark}</span>
          </button>
        </div>
      </div>

      {/* Live status + Auth */}
      <div className="px-3 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 space-y-2">
        <TenantSwitcher />
        <LiveIndicator />
        <AuthButton />
        <p className="text-[10px] text-muted-foreground px-1">⌘K · PWA ready</p>
      </div>
    </aside>
  );
}
