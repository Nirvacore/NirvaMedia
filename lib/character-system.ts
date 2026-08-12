export type CharacterStatus = "demo-active" | "design-ready" | "concept-registered";

export type NirvaCharacter = {
  id: string;
  product: string;
  thaiRole: string;
  archetype: string;
  accent: string;
  symbol: string;
  mission: string;
  status: CharacterStatus;
};

export const characterStatusLabels: Record<CharacterStatus, string> = {
  "demo-active": "Demo active",
  "design-ready": "Design ready",
  "concept-registered": "Concept registered",
};

export const nirvaCharacters: NirvaCharacter[] = [
  { id: "ai", product: "Nirva AI", thaiRole: "ผู้ช่วย", archetype: "Violet robot", accent: "#9b5cff", symbol: "AI", mission: "คิด ช่วย และประสานความรู้ให้ทุกผลิตภัณฑ์", status: "design-ready" },
  { id: "cloud", product: "Nirva Cloud", thaiRole: "ผู้ดูแล", archetype: "Blue cloud keeper", accent: "#66cfff", symbol: "☁", mission: "เก็บ ส่งต่อ และปกป้องไฟล์กับข้อมูล", status: "design-ready" },
  { id: "connect", product: "Nirva Connect", thaiRole: "ปลาหมึก API", archetype: "Cobalt connector octopus", accent: "#387cff", symbol: "∞", mission: "เชื่อมระบบ บัญชี และเหตุการณ์ให้ไหลต่อกัน", status: "design-ready" },
  { id: "academy", product: "Nirva Academy", thaiRole: "อาจารย์", archetype: "Indigo owl mentor", accent: "#7256d9", symbol: "✦", mission: "เปลี่ยนความรู้ให้เป็นการเรียนรู้และการเติบโต", status: "design-ready" },
  { id: "media", product: "Nirva Media", thaiRole: "ผู้สร้าง", archetype: "Rainbow creator", accent: "#ff5dcf", symbol: "M", mission: "สร้างเรื่องราวที่มีคุณค่าและพาไปได้ทุกช่องทาง", status: "demo-active" },
  { id: "marketplace", product: "Nirva Marketplace", thaiRole: "พ่อค้า", archetype: "Amber explorer", accent: "#ff9d35", symbol: "◇", mission: "เชื่อมสินค้า บริการ และโอกาสทางธุรกิจ", status: "design-ready" },
  { id: "finance", product: "Nirva Finance", thaiRole: "นกฮูกนักวิเคราะห์", archetype: "Cyan analyst owl", accent: "#35d6e8", symbol: "↗", mission: "ทำให้ตัวเลขโปร่งใส เข้าใจง่าย และตัดสินใจได้", status: "design-ready" },
  { id: "gov", product: "Nirva Gov", thaiRole: "ผู้พิทักษ์", archetype: "Emerald guardian", accent: "#78c85a", symbol: "⚖", mission: "ดูแลกติกา ความน่าเชื่อถือ และประโยชน์สาธารณะ", status: "design-ready" },
  { id: "core", product: "NirvaCore", thaiRole: "สถาปนิกองค์กร", archetype: "Navy elephant architect", accent: "#315b88", symbol: "N", mission: "จัดระบบคน งาน เงิน และความรู้ให้เป็นฐานเดียวกัน", status: "concept-registered" },
  { id: "check", product: "NirvaCheck", thaiRole: "ผู้ตรวจภาคสนาม", archetype: "Lime scout", accent: "#a4d65e", symbol: "✓", mission: "ยืนยันข้อเท็จจริงหน้างานอย่างเคารพผู้ใช้งาน", status: "concept-registered" },
  { id: "audit", product: "NirvaAudit", thaiRole: "นักสืบหลักฐาน", archetype: "Plum raven detective", accent: "#8f5aa8", symbol: "◎", mission: "เชื่อมหลักฐาน ความเสี่ยง และการแก้ไขให้ตรวจสอบได้", status: "concept-registered" },
  { id: "docs", product: "NirvaDocs", thaiRole: "บรรณารักษ์", archetype: "Sky fox librarian", accent: "#64a7d9", symbol: "▤", mission: "เก็บบริบท เอกสาร และความรู้ให้ค้นพบได้ทันที", status: "concept-registered" },
  { id: "compliance", product: "NirvaCompliance", thaiRole: "ผู้ดูแลมาตรฐาน", archetype: "Teal compass turtle", accent: "#2fb6a3", symbol: "⌖", mission: "แปลงมาตรฐานให้เป็นงานที่ทำได้และติดตามได้", status: "concept-registered" },
  { id: "executive", product: "NirvaExecutive", thaiRole: "ผู้นำทาง", archetype: "Gold eagle strategist", accent: "#e8b849", symbol: "◆", mission: "มองภาพรวม เตือนก่อนเกิดปัญหา และช่วยตัดสินใจ", status: "concept-registered" },
  { id: "procure", product: "NirvaProcure", thaiRole: "นักจัดหา", archetype: "Copper beaver builder", accent: "#bf7444", symbol: "▣", mission: "ทำให้คำขอ งบประมาณ ผู้ขาย และการอนุมัติต่อเนื่องกัน", status: "concept-registered" },
  { id: "voice", product: "NirvaVoice", thaiRole: "ผู้รับฟัง", archetype: "Coral songbird", accent: "#ff7770", symbol: "◖", mission: "รับเสียงมนุษย์แล้วเปลี่ยนเป็นข้อมูลและงานที่มีความหมาย", status: "concept-registered" },
];

export const characterPrinciples = [
  "หนึ่งผลิตภัณฑ์ หนึ่งตัวละคร หนึ่งภารกิจที่จำได้",
  "รูปร่างต่างกัน แต่ใช้ดวงตา สัดส่วน แสง และวัสดุในตระกูลเดียวกัน",
  "สี Navy/Violet เป็นแกนกลาง และมี Accent เฉพาะผลิตภัณฑ์",
  "ตัวละครช่วยอธิบายระบบ ไม่บดบังข้อมูลและไม่ใช้แทนสถานะจริง",
  "ทุกภาพต้องมีรหัสเวอร์ชัน เจ้าของ และสถานะอนุมัติก่อนขึ้น Production",
];
