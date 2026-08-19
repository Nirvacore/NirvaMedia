/**
 * Nirva Ecosystem — canonical registry of all Nirvacore products.
 * This dashboard (nirva-AI) is the control tower that orchestrates the ecosystem.
 */

export type EcosystemAppStatus = "active" | "development" | "planned";
export type EcosystemAppRole = "control-tower" | "product" | "infrastructure" | "integration";

export interface EcosystemApp {
  id: string;
  name: string;
  tagline: string;
  description: string;
  role: EcosystemAppRole;
  status: EcosystemAppStatus;
  repo: string;
  stack: string[];
  agents: string[];
  healthPath?: string;
  defaultUrl?: string;
  envKey?: string;
  color: string;
  icon: string;
}

export const NIRVA_ECOSYSTEM: EcosystemApp[] = [
  {
    id: "nirva-ai",
    name: "Nirva AI Core",
    tagline: "109 Agents. One Garden.",
    description: "Control tower dashboard — agent registry, chat, memory, workflows, voice command",
    role: "control-tower",
    status: "active",
    repo: "https://github.com/Nirvacore/nirva-AI",
    stack: ["React 19", "Express", "SQLite", "Qdrant", "Ollama"],
    agents: ["DESK", "FLOW", "CODE", "ARCH", "RAG-BUILDER"],
    healthPath: "/api/health",
    defaultUrl: "http://localhost:3000",
    color: "#7C9A82",
    icon: "leaf",
  },
  {
    id: "nirvaprocure",
    name: "Nirvaprocure",
    tagline: "AI Procurement OS",
    description: "AI-augmented procurement for Thailand & ASEAN SMEs — marketplace, LINE approval, PDPA-ready",
    role: "product",
    status: "active",
    repo: "https://github.com/Nirvacore/Nirvaprocure",
    stack: ["Next.js 14", "NestJS 10", "Flutter", "PostgreSQL"],
    agents: ["READ", "PRICE", "REACH", "STAMP", "WIN"],
    healthPath: "/api/health",
    defaultUrl: "http://localhost:4000",
    envKey: "VITE_NIRVAPROCURE_URL",
    color: "#4A90D9",
    icon: "shopping-cart",
  },
  {
    id: "nirvasell",
    name: "Nirvasell",
    tagline: "AI Commerce Engine",
    description: "E-commerce and sales automation platform powered by Nirva agents",
    role: "product",
    status: "development",
    repo: "https://github.com/Nirvacore/Nirvasell",
    stack: ["Python", "FastAPI", "PostgreSQL"],
    agents: ["REACH", "GROW", "BLOOM", "PIXEL"],
    healthPath: "/health",
    defaultUrl: "http://localhost:5000",
    envKey: "VITE_NIRVASELL_URL",
    color: "#E8A838",
    icon: "store",
  },
  {
    id: "nirvamedia",
    name: "NirvaMedia",
    tagline: "AI Content Studio",
    description: "Media production, SEO content, video, and social media automation",
    role: "product",
    status: "development",
    repo: "https://github.com/Nirvacore/NirvaMedia",
    stack: ["React", "Node.js", "FFmpeg"],
    agents: ["PHOTON", "SEO-CONTENT", "BLOOM", "GATHER"],
    healthPath: "/api/health",
    defaultUrl: "http://localhost:5001",
    envKey: "VITE_NIRVAMEDIA_URL",
    color: "#C75B9A",
    icon: "film",
  },
  {
    id: "mutea",
    name: "MUTEA",
    tagline: "Wellness & Community",
    description: "MU Universe wellness platform — tea culture, community, mindfulness agents",
    role: "product",
    status: "development",
    repo: "https://github.com/Nirvacore/MUTEA",
    stack: ["React", "Node.js"],
    agents: ["TEACH", "WEAVE", "GATHER"],
    defaultUrl: "http://localhost:5002",
    envKey: "VITE_MUTEA_URL",
    color: "#8B6F4E",
    icon: "coffee",
  },
  {
    id: "mahasunyataland",
    name: "MahasunyataLand",
    tagline: "Digital Sanctuary",
    description: "Immersive digital experience platform — spiritual tech and mindful design",
    role: "product",
    status: "planned",
    repo: "https://github.com/Nirvacore/MahasunyataLand",
    stack: ["Web3", "React", "Three.js"],
    agents: ["SAGE", "PHOTON"],
    defaultUrl: "http://localhost:5003",
    envKey: "VITE_MAHA_URL",
    color: "#9B7ED9",
    icon: "mountain",
  },
];

export const ECOSYSTEM_INFRASTRUCTURE = [
  { id: "ollama", name: "Ollama", desc: "Self-hosted LLM", port: 11434, envKey: "VITE_OLLAMA_URL" },
  { id: "qdrant", name: "Qdrant", desc: "Vector memory", port: 6333, envKey: "VITE_QDRANT_URL" },
  { id: "n8n", name: "n8n", desc: "Workflow orchestrator", port: 5678, envKey: "VITE_N8N_URL" },
] as const;

export function getEcosystemApp(id: string): EcosystemApp | undefined {
  return NIRVA_ECOSYSTEM.find((a) => a.id === id);
}

export function getControlTower(): EcosystemApp {
  return NIRVA_ECOSYSTEM.find((a) => a.role === "control-tower")!;
}

export function getProductApps(): EcosystemApp[] {
  return NIRVA_ECOSYSTEM.filter((a) => a.role === "product");
}
