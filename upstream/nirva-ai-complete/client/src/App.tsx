import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { LiveProvider } from "./contexts/LiveContext";
import { AuthProvider } from "./contexts/AuthContext";
import { TenantProvider } from "./contexts/TenantContext";
import CommandPalette from "./components/CommandPalette";
import InstallPrompt from "./components/InstallPrompt";
import OfflineBanner from "./components/OfflineBanner";

const Home = lazy(() => import("./pages/Home"));
const Agents = lazy(() => import("./pages/Agents"));
const AgentDetail = lazy(() => import("./pages/AgentDetail"));
const MindMap = lazy(() => import("./pages/MindMap"));
const Voice = lazy(() => import("./pages/Voice"));
const Chat = lazy(() => import("./pages/Chat"));
const Memory = lazy(() => import("./pages/Memory"));
const Ecosystem = lazy(() => import("./pages/Ecosystem"));
const Workflows = lazy(() => import("./pages/Workflows"));
const Plugins = lazy(() => import("./pages/Plugins"));
const Orchestration = lazy(() => import("./pages/Orchestration"));
const Brains = lazy(() => import("./pages/Brains"));
const Providers = lazy(() => import("./pages/Providers"));
const Workspace = lazy(() => import("./pages/Workspace"));
const Enterprise = lazy(() => import("./pages/Enterprise"));
const Docs = lazy(() => import("./pages/Docs"));
const Demo = lazy(() => import("./pages/Demo"));
const Organization = lazy(() => import("./pages/Organization"));
const Reports = lazy(() => import("./pages/Reports"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Files = lazy(() => import("./pages/Files"));
const Terminal = lazy(() => import("./pages/Terminal"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/agents"} component={Agents} />
        <Route path={"/agents/:name"} component={AgentDetail} />
        <Route path={"/mindmap"} component={MindMap} />
        <Route path={"/voice"} component={Voice} />
        <Route path={"/chat"} component={Chat} />
        <Route path={"/memory"} component={Memory} />
        <Route path={"/ecosystem"} component={Ecosystem} />
        <Route path={"/workflows"} component={Workflows} />
        <Route path={"/marketplace"} component={Marketplace} />
        <Route path={"/plugins"} component={Plugins} />
        <Route path={"/docs"} component={Docs} />
        <Route path={"/demo"} component={Demo} />
        <Route path={"/organization"} component={Organization} />
        <Route path={"/orchestration"} component={Orchestration} />
        <Route path={"/brains"} component={Brains} />
        <Route path={"/providers"} component={Providers} />
        <Route path={"/workspace"} component={Workspace} />
        <Route path={"/enterprise"} component={Enterprise} />
        <Route path={"/reports"} component={Reports} />
        <Route path={"/tasks"} component={Tasks} />
        <Route path={"/files"} component={Files} />
        <Route path={"/terminal"} component={Terminal} />
        <Route path={"/settings"} component={Settings} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <LiveProvider>
            <AuthProvider>
              <TenantProvider>
                <TooltipProvider>
                <OfflineBanner />
                <Toaster />
                <CommandPalette />
                <InstallPrompt />
                <Router />
                </TooltipProvider>
              </TenantProvider>
            </AuthProvider>
          </LiveProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
