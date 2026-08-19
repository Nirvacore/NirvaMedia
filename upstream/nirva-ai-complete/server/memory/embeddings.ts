const DEFAULT_EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "nomic-embed-text";
const EMBEDDING_DIM = Number(process.env.EMBEDDING_DIM || 384);

export function embeddingDimension(): number {
  return EMBEDDING_DIM;
}

/** Deterministic fallback when Ollama embeddings are unavailable */
export function fallbackEmbedding(text: string, dim = EMBEDDING_DIM): number[] {
  const vec = new Array(dim).fill(0);
  const normalized = text.toLowerCase().trim();
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    vec[i % dim] += code / 255;
    vec[(i * 7 + code) % dim] += 0.01;
  }
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vec.map((v) => v / magnitude);
}

export async function embedText(
  text: string,
  ollamaUrl: string,
  model = DEFAULT_EMBEDDING_MODEL
): Promise<{ vector: number[]; source: "ollama" | "fallback" }> {
  try {
    const response = await fetch(`${ollamaUrl.replace(/\/$/, "")}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: text }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) throw new Error(`Ollama embeddings ${response.status}`);

    const data = (await response.json()) as { embedding: number[] };
    if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
      throw new Error("Empty embedding response");
    }

    return { vector: data.embedding, source: "ollama" };
  } catch {
    return { vector: fallbackEmbedding(text), source: "fallback" };
  }
}
