import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCallback } from "react";

interface NavRoute {
  path: string;
  keywords: string[];
}

// Multi-language navigation keywords for each route
const NAV_ROUTES: NavRoute[] = [
  {
    path: "/",
    keywords: [
      // Thai
      "หน้าหลัก", "แดชบอร์ด", "หน้าแรก", "กลับหน้าหลัก", "กลับบ้าน", "โฮม",
      // English
      "home", "dashboard", "main", "go home", "go back", "back to home", "overview",
      // Japanese
      "ホーム", "ダッシュボード", "メイン",
      // Chinese
      "首页", "主页", "仪表盘",
      // Korean
      "홈", "대시보드", "메인",
      // Vietnamese
      "trang chủ", "bảng điều khiển",
      // Indonesian
      "beranda", "halaman utama",
      // Malay
      "laman utama",
    ],
  },
  {
    path: "/voice",
    keywords: [
      // Thai
      "สั่งด้วยเสียง", "หน้าเสียง", "เปิดเสียง", "พูดสั่ง", "voice",
      // English
      "voice", "voice command", "voice control", "speak", "open voice",
      // Japanese
      "音声", "ボイス", "音声コマンド",
      // Chinese
      "语音", "语音命令",
      // Korean
      "음성", "음성 명령",
      // Vietnamese
      "giọng nói", "lệnh giọng nói",
      // Indonesian
      "suara", "perintah suara",
      // Malay
      "arahan suara",
    ],
  },
  {
    path: "/mindmap",
    keywords: [
      // Thai
      "แผนผัง", "แผนที่", "ไมนด์แมป", "mind map", "เปิดแผนผัง", "ดูแผนผัง", "สถาปัตยกรรม",
      // English
      "mind map", "mindmap", "map", "architecture", "diagram", "open map", "system map",
      // Japanese
      "マインドマップ", "マップ", "アーキテクチャ",
      // Chinese
      "思维导图", "架构图", "地图",
      // Korean
      "마인드맵", "아키텍처", "지도",
      // Vietnamese
      "sơ đồ", "bản đồ tư duy",
      // Indonesian
      "peta pikiran", "arsitektur",
      // Malay
      "peta minda",
    ],
  },
  {
    path: "/agents",
    keywords: [
      // Thai
      "ผู้ช่วย", "เอเจนต์", "agent", "ดูผู้ช่วย", "เปิดผู้ช่วย", "รายชื่อ", "ทีม",
      // English
      "agents", "agent", "ai agents", "directory", "team", "open agents", "show agents",
      // Japanese
      "エージェント", "チーム", "ディレクトリ",
      // Chinese
      "代理", "助手", "团队",
      // Korean
      "에이전트", "팀", "디렉토리",
      // Vietnamese
      "trợ lý", "đại lý",
      // Indonesian
      "agen", "asisten",
      // Malay
      "ejen", "pembantu",
    ],
  },
];

// Action keywords that indicate navigation intent
const NAV_INTENT_KEYWORDS = [
  // Thai
  "เปิด", "ไป", "ไปที่", "ไปหน้า", "เปลี่ยนหน้า", "พาไป", "แสดง", "ดู", "กลับ",
  // English
  "open", "go to", "go", "navigate", "show", "switch to", "take me to", "bring me to", "view",
  // Japanese
  "開く", "表示", "移動",
  // Chinese
  "打开", "去", "显示", "切换",
  // Korean
  "열어", "가", "보여줘", "이동",
  // Vietnamese
  "mở", "đi đến", "hiển thị",
  // Indonesian
  "buka", "pergi ke", "tampilkan",
  // Malay
  "buka", "pergi ke", "tunjukkan",
];

export interface VoiceNavResult {
  navigated: boolean;
  destination: string | null;
  path: string | null;
}

export function useVoiceNavigation() {
  const [, setLocation] = useLocation();
  const { locale } = useLanguage();

  const tryNavigate = useCallback(
    (transcript: string): VoiceNavResult => {
      const lowerText = transcript.toLowerCase().trim();

      // Check if the text contains navigation intent
      const hasNavIntent = NAV_INTENT_KEYWORDS.some((keyword) =>
        lowerText.includes(keyword.toLowerCase())
      );

      // Try to match a route
      for (const route of NAV_ROUTES) {
        const matched = route.keywords.some((keyword) =>
          lowerText.includes(keyword.toLowerCase())
        );

        if (matched) {
          // If there's clear nav intent OR the keyword is very specific, navigate
          if (hasNavIntent || isStrongMatch(lowerText, route.keywords)) {
            setLocation(route.path);
            return {
              navigated: true,
              destination: getDestinationName(route.path, locale),
              path: route.path,
            };
          }
        }
      }

      return { navigated: false, destination: null, path: null };
    },
    [setLocation, locale]
  );

  return { tryNavigate };
}

// Check if the transcript is a strong/direct match (not just a passing mention)
function isStrongMatch(text: string, keywords: string[]): boolean {
  // If the entire text is basically just the keyword (with some filler words), it's a strong match
  const fillerWords = [
    "ไปที่", "เปิด", "ไป", "หน้า", "the", "to", "page", "open", "go",
    "please", "หน่อย", "ครับ", "ค่ะ", "นะ", "ที", "ให้",
  ];

  let cleaned = text.toLowerCase();
  for (const filler of fillerWords) {
    cleaned = cleaned.replace(new RegExp(filler, "gi"), "").trim();
  }

  // If after removing filler words, what's left matches a keyword closely
  return keywords.some(
    (kw) => cleaned.includes(kw.toLowerCase()) || kw.toLowerCase().includes(cleaned)
  );
}

function getDestinationName(path: string, locale: string): string {
  const names: Record<string, Record<string, string>> = {
    "/": {
      th: "หน้าหลัก",
      en: "Dashboard",
      ja: "ダッシュボード",
      zh: "首页",
      ko: "대시보드",
      vi: "Trang chủ",
      id: "Beranda",
      ms: "Laman Utama",
    },
    "/voice": {
      th: "สั่งด้วยเสียง",
      en: "Voice Command",
      ja: "音声コマンド",
      zh: "语音命令",
      ko: "음성 명령",
      vi: "Lệnh giọng nói",
      id: "Perintah Suara",
      ms: "Arahan Suara",
    },
    "/mindmap": {
      th: "แผนผังระบบ",
      en: "Mind Map",
      ja: "マインドマップ",
      zh: "思维导图",
      ko: "마인드맵",
      vi: "Sơ đồ tư duy",
      id: "Peta Pikiran",
      ms: "Peta Minda",
    },
    "/agents": {
      th: "ผู้ช่วย AI",
      en: "AI Agents",
      ja: "AIエージェント",
      zh: "AI助手",
      ko: "AI 에이전트",
      vi: "Trợ lý AI",
      id: "Agen AI",
      ms: "Ejen AI",
    },
  };

  const lang = locale.split("-")[0];
  return names[path]?.[lang] || names[path]?.["en"] || path;
}
