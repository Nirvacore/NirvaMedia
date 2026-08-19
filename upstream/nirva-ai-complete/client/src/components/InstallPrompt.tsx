import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    const dismissedAt = localStorage.getItem("nirva-pwa-dismissed");
    if (dismissedAt && Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000) {
      setDismissed(true);
    }

    function onInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onInstall);
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);

  if (installed || dismissed || !deferred) return null;

  async function handleInstall() {
    await deferred!.prompt();
    const { outcome } = await deferred!.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null);
  }

  function handleDismiss() {
    localStorage.setItem("nirva-pwa-dismissed", String(Date.now()));
    setDismissed(true);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-card border border-border rounded-2xl shadow-xl p-4 animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">ติดตั้ง Nirva AI</p>
          <p className="text-xs text-muted-foreground mt-0.5">ใช้งานแบบแอปบนมือถือหรือเดสก์ท็อป — รองรับ offline</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
            >
              ติดตั้ง
            </button>
            <button onClick={handleDismiss} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted">
              ไว้ทีหลัง
            </button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
