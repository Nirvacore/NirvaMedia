import type {
  AIResponse,
  BoardCard,
  Campaign,
  Capture,
  ContentItem,
  Project,
  RoadmapModule,
  ScheduledPost,
} from "@/types";

export const mockProjects: Project[] = [
  {
    id: "prj_1",
    name: "Nirva Studio launch teaser",
    description: "Campaign assets, teaser video, and landing content for launch week.",
    progress: 62,
    status: "active",
    accent: "violet",
  },
  {
    id: "prj_2",
    name: "AI ERP for Thai businesses",
    description: "Podcast mini-series exploring AI-first ERP for Thai SMEs.",
    progress: 35,
    status: "active",
    accent: "gold",
  },
  {
    id: "prj_3",
    name: "BEST Investigation relationship map",
    description: "Map companies, people, contracts, and projects into one graph.",
    progress: 80,
    status: "active",
    accent: "violet",
  },
];

export const mockCaptures: Capture[] = [
  {
    id: "cap_1",
    kind: "voice",
    title: "AI ERP for Thai businesses",
    preview:
      "ไอเดีย podcast: ทำไม SME ไทยต้องการ ERP ที่มี AI ในตัว ไม่ใช่แค่ระบบบันทึกข้อมูล...",
    duration: "2:41",
    createdAt: "Today · 09:12",
    processed: false,
    tags: ["podcast", "erp", "ai"],
  },
  {
    id: "cap_2",
    kind: "text",
    title: "Creator operating system",
    preview:
      "Short video script idea — everyone talks about content, nobody talks about the operating system behind a creator.",
    createdAt: "Today · 08:03",
    processed: true,
    tags: ["shorts", "positioning"],
  },
  {
    id: "cap_3",
    kind: "voice",
    title: "Launch teaser angle",
    preview: "โน้ตเสียงตอนขับรถ: teaser ควรเปิดด้วยคำถาม 'คุณใช้กี่แอปกว่าจะโพสต์ได้หนึ่งโพสต์?'",
    duration: "1:12",
    createdAt: "Yesterday · 18:45",
    processed: false,
    tags: ["campaign", "hook"],
  },
  {
    id: "cap_4",
    kind: "upload",
    title: "Moodboard screenshots",
    preview: "8 reference images — calm dark dashboards, spatial canvases, cinematic gradients.",
    createdAt: "Yesterday · 14:20",
    processed: true,
    tags: ["design", "reference"],
  },
];

export const mockContentItems: ContentItem[] = [
  {
    id: "cnt_1",
    title: "Short video script — creator operating system",
    type: "tiktok",
    status: "draft",
    excerpt:
      "HOOK: You don't have a content problem. You have an operating system problem...",
    platform: "tiktok",
    updatedAt: "1h ago",
  },
  {
    id: "cnt_2",
    title: "Draft Facebook post from voice note",
    type: "facebook",
    status: "idea",
    excerpt: "จากโน้ตเสียง 'AI ERP for Thai businesses' — แปลงเป็นโพสต์เล่าเรื่องสำหรับเพจ",
    platform: "facebook",
    updatedAt: "2h ago",
  },
  {
    id: "cnt_3",
    title: "Podcast outline — AI ERP EP.1",
    type: "podcast",
    status: "ready",
    excerpt: "EP.1: ทำไม ERP แบบเดิมถึงไม่พอสำหรับธุรกิจไทยยุค AI (3 ช่วง, 25 นาที)",
    updatedAt: "Yesterday",
  },
  {
    id: "cnt_4",
    title: "Launch teaser — 15s cut",
    type: "youtube",
    status: "ready",
    excerpt: "Storyboard: one screen → many apps collapse into one calm dashboard.",
    platform: "youtube",
    updatedAt: "Yesterday",
  },
  {
    id: "cnt_5",
    title: "Blog — Why we built Nirva Studio OS",
    type: "blog",
    status: "draft",
    excerpt: "The tools multiplied. The focus didn't. Here's the operating system we wanted...",
    platform: "website",
    updatedAt: "2d ago",
  },
  {
    id: "cnt_6",
    title: "Newsletter #1 — Behind the build",
    type: "email",
    status: "idea",
    excerpt: "First issue: what a creator command center looks like from the inside.",
    updatedAt: "3d ago",
  },
  {
    id: "cnt_7",
    title: "Course lesson — Capture to content in 10 minutes",
    type: "course",
    status: "published",
    excerpt: "Lesson 1 of the Nirva Academy pilot: the capture-first workflow.",
    updatedAt: "1w ago",
  },
];

export const mockCampaigns: Campaign[] = [
  {
    id: "cmp_1",
    name: "Nirva Studio launch teaser",
    status: "running",
    platforms: ["facebook", "tiktok", "youtube", "instagram"],
    startDate: "Jul 6",
    endDate: "Jul 19",
    postCount: 9,
  },
  {
    id: "cmp_2",
    name: "AI ERP podcast series",
    status: "planning",
    platforms: ["youtube", "facebook", "website"],
    startDate: "Jul 21",
    endDate: "Aug 15",
    postCount: 6,
  },
  {
    id: "cmp_3",
    name: "Founder notes — weekly",
    status: "running",
    platforms: ["linkedin", "website"],
    startDate: "Jul 1",
    endDate: "Jul 31",
    postCount: 4,
  },
];

export const mockScheduledPosts: ScheduledPost[] = [
  { id: "pst_1", title: "Teaser hook #1 — 'กี่แอปกว่าจะได้หนึ่งโพสต์?'", platform: "tiktok", day: 7, time: "18:00", campaignId: "cmp_1" },
  { id: "pst_2", title: "Behind the build — screenshot thread", platform: "facebook", day: 8, time: "12:30", campaignId: "cmp_1" },
  { id: "pst_3", title: "Founder note — why one dashboard", platform: "linkedin", day: 9, time: "09:00", campaignId: "cmp_3" },
  { id: "pst_4", title: "Teaser 15s cut", platform: "youtube", day: 11, time: "19:00", campaignId: "cmp_1" },
  { id: "pst_5", title: "Launch week visual", platform: "instagram", day: 13, time: "20:00", campaignId: "cmp_1" },
  { id: "pst_6", title: "Blog — Why we built Nirva Studio OS", platform: "website", day: 15, time: "10:00" },
  { id: "pst_7", title: "AI ERP series announcement", platform: "facebook", day: 21, time: "12:00", campaignId: "cmp_2" },
  { id: "pst_8", title: "Podcast EP.1 clip", platform: "tiktok", day: 24, time: "18:30", campaignId: "cmp_2" },
  { id: "pst_9", title: "Founder note — capture-first workflow", platform: "linkedin", day: 28, time: "09:00", campaignId: "cmp_3" },
];

export const mockBoardCards: BoardCard[] = [
  { id: "bc_1", kind: "voice", title: "Voice note", body: "AI ERP for Thai businesses — 2:41, unprocessed", x: 40, y: 60, w: 260, accent: "violet" },
  { id: "bc_2", kind: "podcast", title: "Podcast outline", body: "EP.1 · ทำไม ERP เดิมไม่พอ — 3 ช่วง / 25 นาที", x: 360, y: 40, w: 280, accent: "gold" },
  { id: "bc_3", kind: "campaign", title: "Marketing campaign", body: "Nirva Studio launch teaser — 9 posts across 4 platforms", x: 700, y: 90, w: 300, accent: "violet" },
  { id: "bc_4", kind: "graph", title: "Relationship graph", body: "BEST Investigation — 9 nodes, 8 relations", x: 130, y: 320, w: 280, accent: "neutral" },
  { id: "bc_5", kind: "ai", title: "AI summary", body: "3 ideas this week converge on 'operating system for creators' — suggest a series.", x: 480, y: 300, w: 300, accent: "violet" },
  { id: "bc_6", kind: "tasks", title: "Task list", body: "① Draft FB post from voice note ② Approve teaser cut ③ Review captures", x: 840, y: 340, w: 270, accent: "gold" },
  { id: "bc_7", kind: "draft", title: "Content draft", body: "Short video script — creator operating system (HOOK ready)", x: 260, y: 560, w: 300, accent: "neutral" },
  { id: "bc_8", kind: "assets", title: "Asset library", body: "12 assets · moodboards, logo drafts, teaser storyboards", x: 660, y: 580, w: 260, accent: "neutral" },
];

export const mockAIResponses: AIResponse[] = [
  {
    match: ["create today", "what should i create"],
    reply:
      "Based on your pipeline: the podcast outline 'AI ERP EP.1' is Ready, and your teaser campaign needs one more TikTok hook this week. Suggestion — record EP.1 today (25 min block), then turn its best 60 seconds into the missing TikTok clip.",
    sources: [
      { title: "Podcast outline — AI ERP EP.1", kind: "content" },
      { title: "Campaign: Nirva Studio launch teaser", kind: "task" },
    ],
  },
  {
    match: ["summarize", "nirva studio ideas"],
    reply:
      "Your Nirva Studio ideas cluster into 3 themes: ① One calm dashboard vs. app chaos (teaser hook), ② Capture-first workflow (course lesson published), ③ The 'operating system' positioning (short video draft). Theme ① has the strongest campaign momentum.",
    sources: [
      { title: "Voice note — Launch teaser angle", kind: "capture" },
      { title: "Short video script — creator OS", kind: "content" },
      { title: "Course lesson — Capture to content", kind: "content" },
    ],
  },
  {
    match: ["ready", "which content"],
    reply:
      "2 items are Ready to publish: 'Podcast outline — AI ERP EP.1' and 'Launch teaser — 15s cut'. The teaser cut is scheduled for Jul 11 on YouTube; the podcast has no slot yet — want me to suggest one?",
    sources: [
      { title: "Podcast outline — AI ERP EP.1", kind: "content" },
      { title: "Launch teaser — 15s cut", kind: "content" },
    ],
  },
  {
    match: ["best", "relationship"],
    reply:
      "BEST Investigation Co., Ltd. connects to 8 entities: the Founder owns it; it serves Customer Site A (cleaning service project, active contract) and buys from Supplier A. The project generates a marketing campaign, one Facebook post, one voice note, and an open task.",
    sources: [
      { title: "BEST Investigation relationship map", kind: "graph" },
      { title: "Contract Document — Site A", kind: "graph" },
    ],
  },
  {
    match: ["voice note", "facebook post"],
    reply:
      "Draft from your last voice note (AI ERP for Thai businesses):\n\n\"ธุรกิจไทยไม่ได้ขาดข้อมูล — แต่ขาดระบบที่คิดกับเราได้ 🧠 ERP แบบเดิมบันทึกอดีต แต่ AI ERP มองเห็นอนาคต: cash flow เดือนหน้า, สต็อกที่กำลังจะขาด, ลูกค้าที่กำลังจะหาย ถ้าธุรกิจคุณมีผู้ช่วยแบบนี้ อยากให้มันเริ่มช่วยเรื่องอะไรก่อน? 💬\"\n\nSaved as an Idea card in Content Studio.",
    sources: [
      { title: "Voice note — AI ERP for Thai businesses", kind: "capture" },
      { title: "Draft Facebook post from voice note", kind: "task" },
    ],
  },
];

export const defaultAIReply: AIResponse = {
  match: [],
  reply:
    "I can answer from your captures, content pipeline, calendar, and relationship graph. Try one of the suggested prompts — real AI arrives in a later phase (see Roadmap).",
  sources: [{ title: "Roadmap — Real AI Chat", kind: "task" }],
};

export const mockRoadmap: RoadmapModule[] = [
  { id: "rm_1", name: "Real Voice Transcription", status: "planned", reason: "Capture flow must be validated with mock first.", dependencies: ["Capture UX sign-off"] },
  { id: "rm_2", name: "Real AI Chat", status: "planned", reason: "Prompt patterns are being collected from the mock assistant.", dependencies: ["AI Gateway", "Knowledge index"] },
  { id: "rm_3", name: "Supabase Database", status: "planned", reason: "Schema will follow the validated mock data shapes.", dependencies: ["Prototype approval"] },
  { id: "rm_4", name: "Media Storage", status: "planned", reason: "Needs database + auth foundation first.", dependencies: ["Supabase Database"] },
  { id: "rm_5", name: "Video Recording", status: "later", reason: "Browser capture is heavy; voice ships first.", dependencies: ["Media Storage"] },
  { id: "rm_6", name: "Social Scheduling", status: "later", reason: "Calendar UX first, platform APIs after.", dependencies: ["Marketing Calendar validation", "Platform connectors"] },
  { id: "rm_7", name: "Translation Layer", status: "planned", reason: "Will reuse Nirva Language Engine (NLE) as the shared service.", dependencies: ["NLE API"] },
  { id: "rm_8", name: "Live Studio", status: "later", reason: "Depends on stable capture + media pipeline.", dependencies: ["Video Recording", "Media Storage"] },
  { id: "rm_9", name: "ERP Connector", status: "later", reason: "Out of prototype scope by design.", dependencies: ["NirvaCore ERP"] },
  { id: "rm_10", name: "Personal Account / Life Ledger", status: "later", reason: "Separate product surface; shares identity only.", dependencies: ["Auth / NID"] },
  { id: "rm_11", name: "NirvaCore ERP", status: "later", reason: "Full business suite comes after creator core proves out.", dependencies: ["Identity", "Shared services"] },
  { id: "rm_12", name: "Nirva Academy", status: "later", reason: "Course content exists; platform waits for storage + auth.", dependencies: ["Media Storage", "Auth / NID"] },
  { id: "rm_13", name: "Nirva Cloud", status: "later", reason: "Infrastructure layer scales after product-market fit.", dependencies: ["All core modules"] },
];
