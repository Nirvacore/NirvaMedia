import { embeddingDimension } from "./embeddings.ts";

const COLLECTION = process.env.QDRANT_COLLECTION || "nirva_memory";

export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

export interface QdrantSearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

export class QdrantClient {
  constructor(private baseUrl: string) {}

  private url(path: string) {
    return `${this.baseUrl.replace(/\/$/, "")}${path}`;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(this.url("/collections"), { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async ensureCollection(): Promise<void> {
    const check = await fetch(this.url(`/collections/${COLLECTION}`), {
      signal: AbortSignal.timeout(5000),
    });

    if (check.ok) return;

    const create = await fetch(this.url(`/collections/${COLLECTION}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vectors: { size: embeddingDimension(), distance: "Cosine" },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!create.ok) {
      const text = await create.text();
      throw new Error(`Failed to create Qdrant collection: ${text}`);
    }
  }

  async upsertPoint(point: QdrantPoint): Promise<void> {
    await this.ensureCollection();

    const res = await fetch(this.url(`/collections/${COLLECTION}/points`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: [point] }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Qdrant upsert failed: ${text}`);
    }
  }

  async search(vector: number[], agent: string, limit = 5): Promise<QdrantSearchResult[]> {
    await this.ensureCollection();

    const res = await fetch(this.url(`/collections/${COLLECTION}/points/search`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vector,
        limit,
        with_payload: true,
        filter: {
          must: [{ key: "agent", match: { value: agent } }],
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Qdrant search failed: ${text}`);
    }

    const data = (await res.json()) as {
      result: { id: string | number; score: number; payload: Record<string, unknown> }[];
    };

    return data.result.map((r) => ({
      id: String(r.id),
      score: r.score,
      payload: r.payload,
    }));
  }

  async deletePoint(id: string): Promise<void> {
    const res = await fetch(this.url(`/collections/${COLLECTION}/points/delete`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: [id] }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Qdrant delete failed: ${text}`);
    }
  }

  async collectionInfo(): Promise<{ pointsCount: number; status: string } | null> {
    try {
      const res = await fetch(this.url(`/collections/${COLLECTION}`), {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        result: { points_count: number; status: string };
      };
      return { pointsCount: data.result.points_count, status: data.result.status };
    } catch {
      return null;
    }
  }
}

export function createQdrantClient(url: string): QdrantClient {
  return new QdrantClient(url);
}
