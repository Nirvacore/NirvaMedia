export type ContentType =
  | "facebook"
  | "tiktok"
  | "youtube"
  | "podcast"
  | "blog"
  | "course"
  | "email";

export type ContentStatus = "idea" | "draft" | "ready" | "published";

export type Platform =
  | "facebook"
  | "tiktok"
  | "youtube"
  | "instagram"
  | "linkedin"
  | "website";

export interface Project {
  id: string;
  name: string;
  description: string;
  progress: number;
  status: "active" | "paused" | "done";
  accent: "violet" | "gold";
}

export interface Capture {
  id: string;
  kind: "voice" | "text" | "video" | "upload";
  title: string;
  preview: string;
  duration?: string;
  createdAt: string;
  processed: boolean;
  tags: string[];
}

export interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  status: ContentStatus;
  excerpt: string;
  platform?: Platform;
  updatedAt: string;
  /** Item came from the real NMD backend via the live bridge */
  live?: boolean;
  /** Full draft body (live items only) */
  body?: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: "planning" | "running" | "done";
  platforms: Platform[];
  startDate: string;
  endDate: string;
  postCount: number;
}

export interface ScheduledPost {
  id: string;
  title: string;
  platform: Platform;
  day: number; // day of month in the mock calendar
  time: string;
  campaignId?: string;
}

export type NodeKind =
  | "company"
  | "person"
  | "customer"
  | "supplier"
  | "document"
  | "project"
  | "content"
  | "task"
  | "capture";

export interface RelationNodeData {
  label: string;
  kind: NodeKind;
  detail: string;
  meta: Array<{ label: string; value: string }>;
  [key: string]: unknown;
}

export interface AISource {
  title: string;
  kind: "capture" | "content" | "graph" | "task";
}

export interface AIResponse {
  match: string[];
  reply: string;
  sources: AISource[];
}

export interface RoadmapModule {
  id: string;
  name: string;
  status: "planned" | "later";
  reason: string;
  dependencies: string[];
}

export interface BoardCard {
  id: string;
  kind:
    | "voice"
    | "podcast"
    | "campaign"
    | "graph"
    | "ai"
    | "tasks"
    | "draft"
    | "assets";
  title: string;
  body: string;
  x: number;
  y: number;
  w: number;
  accent: "violet" | "gold" | "neutral";
}
