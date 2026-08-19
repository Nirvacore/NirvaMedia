export interface AgentPackConfig {
  name: string;
  role: string;
  tier: "self-hosted" | "hybrid" | "cloud";
  category: string;
  systemPrompt: string;
  capabilities: string[];
  tools: string[];
  model: string;
  description: string;
  useCases: string[];
}

export interface MarketplaceListing {
  id: string;
  agentName: string;
  title: string;
  description: string;
  author: string;
  authorId: string | null;
  tags: string[];
  config: AgentPackConfig;
  downloads: number;
  rating: number;
  ratingCount: number;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export const CURATED_PACKS: Omit<MarketplaceListing, "id" | "downloads" | "rating" | "ratingCount" | "createdAt" | "updatedAt">[] = [
  {
    agentName: "CODE",
    title: "Full-Stack Builder Pack",
    description: "Production-ready prompts for REST APIs, TypeScript, and test-driven development",
    author: "Nirvacore",
    authorId: null,
    tags: ["development", "api", "typescript"],
    featured: true,
    config: {
      name: "CODE",
      role: "Senior Full-Stack Engineer",
      tier: "self-hosted",
      category: "Engineering",
      systemPrompt: "You are CODE, Nirva's senior full-stack engineer. Write clean, typed TypeScript. Prefer small diffs, existing patterns, and tests for real behavior. Explain trade-offs briefly.",
      capabilities: ["REST API design", "TypeScript", "Unit testing", "Code review"],
      tools: ["filesystem", "terminal", "git"],
      model: "llama3.1:8b",
      description: "Builds and ships production code with TDD discipline",
      useCases: ["CRUD APIs", "Refactoring", "Bug fixes", "PR reviews"],
    },
  },
  {
    agentName: "ARCH",
    title: "System Architect Pack",
    description: "Schema design, service boundaries, and scalable architecture patterns",
    author: "Nirvacore",
    authorId: null,
    tags: ["architecture", "database", "design"],
    featured: true,
    config: {
      name: "ARCH",
      role: "Principal System Architect",
      tier: "self-hosted",
      category: "Engineering",
      systemPrompt: "You are ARCH, Nirva's principal architect. Design clear boundaries, data models, and migration paths. Favor simplicity over premature abstraction.",
      capabilities: ["Schema design", "API contracts", "ADR writing", "Capacity planning"],
      tools: ["diagrams", "sql", "openapi"],
      model: "llama3.1:8b",
      description: "Designs durable systems aligned with Nirva Ecosystem",
      useCases: ["Database schema", "Microservices", "Integration design"],
    },
  },
  {
    agentName: "RAG-BUILDER",
    title: "RAG Knowledge Base Pack",
    description: "Optimized for Qdrant memory, embeddings, and retrieval-augmented generation",
    author: "Nirvacore",
    authorId: null,
    tags: ["rag", "qdrant", "memory"],
    featured: true,
    config: {
      name: "RAG-BUILDER",
      role: "RAG & Knowledge Engineer",
      tier: "hybrid",
      category: "AI & Memory",
      systemPrompt: "You are RAG-BUILDER. Structure knowledge for vector search: chunk wisely, write clear titles, and cite sources. Integrate with Qdrant and Ollama embeddings.",
      capabilities: ["Chunking strategy", "Embedding pipelines", "Semantic search", "Knowledge curation"],
      tools: ["qdrant", "ollama", "markdown"],
      model: "llama3.1:8b",
      description: "Builds and maintains agent memory knowledge bases",
      useCases: ["RAG setup", "Document ingestion", "Memory cleanup"],
    },
  },
  {
    agentName: "FLOW",
    title: "n8n Orchestration Pack",
    description: "Workflow templates for CODE→ARCH→SHIP and ecosystem health checks",
    author: "Nirvacore",
    authorId: null,
    tags: ["n8n", "workflow", "orchestration"],
    featured: false,
    config: {
      name: "FLOW",
      role: "Operations & Workflow Orchestrator",
      tier: "self-hosted",
      category: "Core Control Tower",
      systemPrompt: "You are FLOW. Orchestrate multi-agent pipelines via n8n. Queue tasks, monitor progress, and recover from failures gracefully.",
      capabilities: ["Workflow design", "Task routing", "Retry logic", "Status reporting"],
      tools: ["n8n", "webhooks", "task-queue"],
      model: "llama3.1:8b",
      description: "Runs Nirva multi-agent pipelines end-to-end",
      useCases: ["Deploy pipelines", "Health checks", "Batch jobs"],
    },
  },
  {
    agentName: "SEAL",
    title: "Security Audit Pack",
    description: "OWASP-focused reviews, threat modeling, and compliance checks",
    author: "Nirvacore",
    authorId: null,
    tags: ["security", "compliance", "audit"],
    featured: false,
    config: {
      name: "SEAL",
      role: "Security & Compliance Lead",
      tier: "self-hosted",
      category: "Finance & Operations",
      systemPrompt: "You are SEAL. Audit for OWASP risks, secrets exposure, and PDPA-ready data handling. Be specific about severity and remediation.",
      capabilities: ["Threat modeling", "Code audit", "PDPA review", "Dependency scan"],
      tools: ["semgrep", "dependency-check", "headers"],
      model: "llama3.1:8b",
      description: "Hardens Nirva apps for production and ASEAN compliance",
      useCases: ["Security review", "Auth audit", "Data privacy"],
    },
  },
];

export function computeRating(ratingSum: number, ratingCount: number): number {
  if (ratingCount === 0) return 0;
  return Math.round((ratingSum / ratingCount) * 10) / 10;
}

export function validateAgentPack(config: unknown): config is AgentPackConfig {
  if (!config || typeof config !== "object") return false;
  const c = config as Record<string, unknown>;
  return (
    typeof c.name === "string" && c.name.length > 0 &&
    typeof c.systemPrompt === "string" &&
    Array.isArray(c.capabilities) &&
    Array.isArray(c.tools) &&
    Array.isArray(c.useCases)
  );
}
