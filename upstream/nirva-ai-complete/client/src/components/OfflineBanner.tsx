import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-[72px] right-0 z-50 bg-amber-500 text-white text-xs font-medium py-2 px-4 flex items-center justify-center gap-2">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline mode — ใช้ข้อมูลที่ cache ไว้ (PWA)</span>
    </div>
  );
}
