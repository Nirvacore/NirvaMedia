import { embedText } from "./embeddings.ts";
import { createQdrantClient } from "./qdrant.ts";
import {
  insertMemoryEntry,
  listMemoryEntries,
  getMemoryEntry,
  deleteMemoryEntry,
  searchMemoryFallback,
  type MemoryEntry,
} from "../db/index.ts";

const DEFAULT_QDRANT_URL = process.env.VITE_QDRANT_URL || "http://localhost:6333";
const DEFAULT_OLLAMA_URL = process.env.VITE_OLLAMA_URL || "http://localhost:11434";

export interface MemorySearchResult {
  id: string;
  agent: string;
  title: string;
  content: string;
  source: string;
  score: number;
  createdAt: string;
}

export async function getMemoryStats(qdrantUrl = DEFAULT_QDRANT_URL) {
  const client = createQdrantClient(qdrantUrl);
  const available = await client.isAvailable();
  const info = available ? await client.collectionInfo() : null;
  return {
    qdrant: available ? "running" : "unavailable",
    collection: "nirva_memory",
    pointsCount: info?.pointsCount ?? 0,
    status: info?.status ?? "unknown",
  };
}

export async function addMemory(
  data: { agent: string; content: string; title?: string; source?: string },
  opts: { qdrantUrl?: string; ollamaUrl?: string } = {}
): Promise<MemoryEntry & { embeddingSource: string }> {
  const agent = data.agent.toUpperCase();
  const qdrantUrl = opts.qdrantUrl || DEFAULT_QDRANT_URL;
  const ollamaUrl = opts.ollamaUrl || DEFAULT_OLLAMA_URL;

  const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const { vector, source: embeddingSource } = await embedText(data.content, ollamaUrl);

  const entry = insertMemoryEntry({
    id,
    agent,
    title: data.title || data.content.slice(0, 80),
    content: data.content,
    source: data.source || "manual",
    qdrantPointId: id,
  });

  const client = createQdrantClient(qdrantUrl);
  if (await client.isAvailable()) {
    await client.upsertPoint({
      id,
      vector,
      payload: {
        agent,
        memoryId: id,
        title: entry.title,
        content: entry.content,
        source: entry.source,
        createdAt: entry.createdAt,
      },
    });
  }

  return { ...entry, embeddingSource };
}

export async function searchMemory(
  agent: string,
  query: string,
  limit = 5,
  opts: { qdrantUrl?: string; ollamaUrl?: string } = {}
): Promise<MemorySearchResult[]> {
  const agentName = agent.toUpperCase();
  const qdrantUrl = opts.qdrantUrl || DEFAULT_QDRANT_URL;
  const ollamaUrl = opts.ollamaUrl || DEFAULT_OLLAMA_URL;

  const client = createQdrantClient(qdrantUrl);
  if (await client.isAvailable()) {
    const { vector } = await embedText(query, ollamaUrl);
    const results = await client.search(vector, agentName, limit);
    return results.map((r) => ({
      id: String(r.payload.memoryId || r.id),
      agent: agentName,
      title: String(r.payload.title || ""),
      content: String(r.payload.content || ""),
      source: String(r.payload.source || "qdrant"),
      score: r.score,
      createdAt: String(r.payload.createdAt || ""),
    }));
  }

  // SQLite text fallback when Qdrant is offline
  return searchMemoryFallback(agentName, query, limit).map((e) => ({
    ...e,
    score: 0.5,
  }));
}

export function listAgentMemory(agent?: string): MemoryEntry[] {
  return listMemoryEntries(agent?.toUpperCase());
}

export async function removeMemory(
  id: string,
  qdrantUrl = DEFAULT_QDRANT_URL
): Promise<boolean> {
  const entry = getMemoryEntry(id);
  if (!entry) return false;

  const client = createQdrantClient(qdrantUrl);
  if (await client.isAvailable() && entry.qdrantPointId) {
    try {
      await client.deletePoint(entry.qdrantPointId);
    } catch {
      // Continue deleting SQLite record even if Qdrant delete fails
    }
  }

  deleteMemoryEntry(id);
  return true;
}

export function buildRagContext(results: MemorySearchResult[]): string {
  if (results.length === 0) return "";

  const snippets = results
    .filter((r) => r.score > 0.3 || results.length === 1)
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}`)
    .join("\n\n");

  if (!snippets) return "";

  return `\n\n--- Relevant memory from past conversations ---\n${snippets}\n--- End memory ---`;
}

export async function storeConversationMemory(
  agent: string,
  userMessage: string,
  assistantMessage: string,
  opts: { qdrantUrl?: string; ollamaUrl?: string } = {}
): Promise<void> {
  const content = `User: ${userMessage}\nAssistant: ${assistantMessage}`;
  await addMemory(
    {
      agent,
      content,
      title: userMessage.slice(0, 80),
      source: "conversation",
    },
    opts
  );
}
