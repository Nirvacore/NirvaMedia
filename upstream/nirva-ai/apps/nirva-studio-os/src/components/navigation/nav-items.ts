import {
  CalendarDays,
  LayoutDashboard,
  LayoutGrid,
  Map,
  Mic,
  Network,
  PenSquare,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  labelTh: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/command-center", label: "Command Center", labelTh: "ศูนย์บัญชาการ", icon: LayoutDashboard },
  { href: "/infinite-board", label: "Infinite Board", labelTh: "บอร์ดไร้ขอบ", icon: LayoutGrid },
  { href: "/capture", label: "Capture", labelTh: "จับไอเดีย", icon: Mic },
  { href: "/content-studio", label: "Content Studio", labelTh: "สตูดิโอคอนเทนต์", icon: PenSquare },
  { href: "/marketing-calendar", label: "Marketing Calendar", labelTh: "ปฏิทินการตลาด", icon: CalendarDays },
  { href: "/relationship-canvas", label: "Relationship Canvas", labelTh: "แผนที่ความสัมพันธ์", icon: Network },
  { href: "/ai-assistant", label: "AI Assistant", labelTh: "ผู้ช่วย AI", icon: Sparkles },
  { href: "/roadmap", label: "Roadmap", labelTh: "แผนอนาคต", icon: Map },
];

/** Compact subset for the mobile bottom nav */
export const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((item) =>
  ["/command-center", "/capture", "/content-studio", "/ai-assistant", "/infinite-board"].includes(item.href)
);
