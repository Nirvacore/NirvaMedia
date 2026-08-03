export const productModules = [
  { id: "content-studio", icon: "✦", name: "AI Content Studio", description: "สร้างคอนเทนต์ข้อความ ภาพ วิดีโอ เสียง และซับไตเติลจากหนึ่ง Brief", layer: "Create" },
  { id: "language-engine", icon: "文", name: "Language Engine", description: "แปลและปรับบริบท น้ำเสียง วัฒนธรรม และคำศัพท์ของแต่ละตลาด", layer: "Localize" },
  { id: "smart-publisher", icon: "↗", name: "Smart Publisher", description: "เชื่อมบัญชี อนุมัติ ตั้งเวลา เผยแพร่ ตรวจสถานะ และลองใหม่อัตโนมัติ", layer: "Distribute" },
  { id: "market-intelligence", icon: "◎", name: "Global Market Intelligence", description: "เลือกประเทศ แพลตฟอร์ม รูปแบบ และลำดับเปิดตลาดที่เหมาะสม", layer: "Expand" },
  { id: "performance-intelligence", icon: "↻", name: "Performance Intelligence", description: "รวมผลลัพธ์ทุกช่องทางและส่งสิ่งที่เรียนรู้กลับไปพัฒนาคอนเทนต์", layer: "Learn" },
  { id: "enterprise-control", icon: "⌘", name: "Enterprise Control", description: "SSO, RBAC, Audit, Compliance, ทีม งบประมาณ และการกำกับดูแล", layer: "Govern" },
  { id: "mobile-workspace", icon: "▣", name: "Mobile Workspace", description: "ตรวจ อนุมัติ รับแจ้งเตือน และทำงานเบื้องต้นบน iOS และ Android", layer: "Anywhere" },
] as const;

export const connectorCatalog = [
  { id: "meta-network", name: "Meta Network", platforms: "Facebook · Instagram · WhatsApp Business · Threads", scope: "Global Core" },
  { id: "google-video", name: "Google Video", platforms: "YouTube · Shorts", scope: "Global Core" },
  { id: "bytedance-global", name: "ByteDance Global", platforms: "TikTok", scope: "Global Core" },
  { id: "line-ecosystem", name: "LINE Ecosystem", platforms: "LINE OA · Messaging · Broadcast", scope: "Asia" },
  { id: "china-dedicated", name: "China Dedicated", platforms: "WeChat · Douyin · Weibo · Xiaohongshu", scope: "China" },
  { id: "regional-plus", name: "Regional Plus", platforms: "Kakao · Naver · Telegram · Snapchat · Pinterest · X · LinkedIn", scope: "Regional" },
] as const;

export const productBundles = [
  {
    id: "starter",
    name: "Starter",
    label: "เริ่มต้นแยกโมดูล",
    description: "สร้างคอนเทนต์และเริ่มต้นกับช่องทางหลักโดยไม่ต้องซื้อระบบทั้งหมด",
    moduleIds: ["content-studio"],
    connectorIds: ["meta-network"],
  },
  {
    id: "growth",
    name: "Growth",
    label: "เติบโตหลายช่องทาง",
    description: "สร้าง ปรับภาษา เผยแพร่ และดูผลลัพธ์ผ่าน Global Core",
    moduleIds: ["content-studio", "language-engine", "smart-publisher", "performance-intelligence"],
    connectorIds: ["meta-network", "google-video", "bytedance-global"],
  },
  {
    id: "asia-expansion",
    name: "Asia Expansion",
    label: "เปิดตลาดเอเชีย",
    description: "Growth พร้อม Market Intelligence และระบบสื่อสารเฉพาะเอเชีย",
    moduleIds: ["content-studio", "language-engine", "smart-publisher", "market-intelligence", "performance-intelligence"],
    connectorIds: ["meta-network", "google-video", "bytedance-global", "line-ecosystem", "regional-plus"],
  },
  {
    id: "china-market",
    name: "China Market",
    label: "ชุดเฉพาะจีน",
    description: "ระบบภาษา การเผยแพร่ และข้อกำกับที่แยกจากแพลตฟอร์ม Global",
    moduleIds: ["content-studio", "language-engine", "smart-publisher", "market-intelligence", "enterprise-control"],
    connectorIds: ["china-dedicated"],
  },
  {
    id: "enterprise-global",
    name: "Enterprise Global",
    label: "เชื่อมครบไร้ขอบเขต",
    description: "ทุกโมดูล ทุก Connector และแกนกำกับดูแลเดียวสำหรับองค์กรทั่วโลก",
    moduleIds: productModules.map((module) => module.id),
    connectorIds: connectorCatalog.map((connector) => connector.id),
  },
] as const;

export const moduleIds = new Set<string>(productModules.map((module) => module.id));
export const connectorIds = new Set<string>(connectorCatalog.map((connector) => connector.id));
