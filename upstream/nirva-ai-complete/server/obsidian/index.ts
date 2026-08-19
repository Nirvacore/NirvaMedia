/**
 * Obsidian Local REST API integration.
 * Requires the "Local REST API" community plugin in Obsidian.
 * Default port: 27124. Configure in plugin settings.
 */

const DEFAULT_OBSIDIAN_URL = process.env.OBSIDIAN_URL || "http://localhost:27124";

interface ObsidianFile {
  path: string;
  type: "file" | "folder";
  children?: ObsidianFile[];
}

export interface VaultNote {
  path: string;
  content: string;
  tags: string[];
}

function headers(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

export async function isObsidianRunning(
  baseUrl = DEFAULT_OBSIDIAN_URL,
  apiKey = ""
): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/`, {
      headers: headers(apiKey),
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listVaultFiles(
  baseUrl = DEFAULT_OBSIDIAN_URL,
  apiKey = ""
): Promise<string[]> {
  const res = await fetch(`${baseUrl}/vault/`, {
    headers: headers(apiKey),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Obsidian API ${res.status}`);
  const data = (await res.json()) as { files: string[] };
  // Return only markdown files
  return (data.files || []).filter((f) => f.endsWith(".md"));
}

export async function readNote(
  path: string,
  baseUrl = DEFAULT_OBSIDIAN_URL,
  apiKey = ""
): Promise<VaultNote> {
  const res = await fetch(`${baseUrl}/vault/${encodeURIComponent(path)}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "text/markdown" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Obsidian read ${path}: ${res.status}`);
  const content = await res.text();

  // Extract tags from frontmatter and inline #tags
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const tags: string[] = [];
  if (fmMatch) {
    const tagsLine = fmMatch[1].match(/tags:\s*\[([^\]]*)\]/);
    if (tagsLine) tags.push(...tagsLine[1].split(",").map((t) => t.trim().replace(/"/g, "")));
  }
  const inlineTags = content.match(/#[\w-]+/g) || [];
  tags.push(...inlineTags.map((t) => t.slice(1)));

  return { path, content, tags: Array.from(new Set(tags)) };
}

export async function writeNote(
  path: string,
  content: string,
  baseUrl = DEFAULT_OBSIDIAN_URL,
  apiKey = ""
): Promise<void> {
  const res = await fetch(`${baseUrl}/vault/${encodeURIComponent(path)}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "text/markdown" },
    body: content,
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Obsidian write ${path}: ${res.status}`);
}

export async function appendToNote(
  path: string,
  content: string,
  baseUrl = DEFAULT_OBSIDIAN_URL,
  apiKey = ""
): Promise<void> {
  const res = await fetch(`${baseUrl}/vault/${encodeURIComponent(path)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "text/markdown" },
    body: "\n" + content,
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Obsidian append ${path}: ${res.status}`);
}

export async function searchVault(
  query: string,
  baseUrl = DEFAULT_OBSIDIAN_URL,
  apiKey = ""
): Promise<{ path: string; score: number; excerpt: string }[]> {
  const res = await fetch(`${baseUrl}/search/simple/?query=${encodeURIComponent(query)}&contextLength=200`, {
    headers: headers(apiKey),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Obsidian search: ${res.status}`);
  const results = (await res.json()) as Array<{
    filename: string;
    score: number;
    matches: Array<{ context: string }>;
  }>;
  return results.map((r) => ({
    path: r.filename,
    score: r.score,
    excerpt: r.matches[0]?.context || "",
  }));
}

/**
 * Sync Obsidian vault into Qdrant via nirva memory system.
 * Reads all markdown files and indexes them as memories for the given agent.
 */
export async function syncVaultToMemory(
  opts: {
    baseUrl?: string;
    apiKey?: string;
    agent?: string;
    qdrantUrl?: string;
    ollamaUrl?: string;
    maxFiles?: number;
  } = {}
): Promise<{ indexed: number; skipped: number; errors: string[] }> {
  const {
    baseUrl = DEFAULT_OBSIDIAN_URL,
    apiKey = "",
    agent = "GATHER",
    maxFiles = 100,
  } = opts;

  const { addMemory } = await import("../memory/index.ts");

  const files = await listVaultFiles(baseUrl, apiKey);
  const toSync = files.slice(0, maxFiles);

  let indexed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const path of toSync) {
    try {
      const note = await readNote(path, baseUrl, apiKey);
      const title = path.replace(/\.md$/, "").split("/").pop() || path;

      // Skip empty or very short notes
      if (note.content.trim().length < 50) {
        skipped++;
        continue;
      }

      await addMemory(
        {
          agent,
          content: note.content.slice(0, 2000),
          title,
          source: `obsidian:${path}`,
        },
        { qdrantUrl: opts.qdrantUrl, ollamaUrl: opts.ollamaUrl }
      );
      indexed++;
    } catch (e) {
      errors.push(`${path}: ${(e as Error).message}`);
      skipped++;
    }
  }

  return { indexed, skipped, errors };
}
