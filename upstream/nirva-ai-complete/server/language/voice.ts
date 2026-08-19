/**
 * NLE Voice (NLE-1700) — speech-to-text behind a swappable provider,
 * following the same provider rules as translation and the AI writer.
 *
 * Default provider resolution (free options first):
 *   1. NLE_STT_PROVIDER=echo  → deterministic echo provider (demos/tests)
 *   2. NLE_STT_URL set        → self-hosted open-source Whisper server with an
 *                               OpenAI-compatible API (faster-whisper-server,
 *                               speaches, LocalAI, whisper.cpp server) — zero cost
 *   3. OPENAI_API_KEY set     → OpenAI Whisper (paid)
 *   4. otherwise              → structured "no provider" error (never throws)
 */

export interface SttRequest {
  audio: Buffer;
  mimeType: string;
  lang?: string;
}

export interface SttResult {
  text: string | null;
  provider: string;
  error?: string;
}

export type SttProvider = (req: SttRequest) => Promise<{ text: string }>;

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

/** Shared client for any OpenAI-compatible transcription endpoint —
 * covers both api.openai.com and self-hosted open-source servers. */
async function openAICompatibleStt(
  req: SttRequest,
  baseUrl: string,
  opts: { key?: string; model: string }
): Promise<{ text: string }> {
  const form = new FormData();
  const ext = req.mimeType.includes("mp4") ? "mp4" : req.mimeType.includes("ogg") ? "ogg" : "webm";
  form.append("file", new Blob([new Uint8Array(req.audio)], { type: req.mimeType }), `capture.${ext}`);
  form.append("model", opts.model);
  if (req.lang) form.append("language", req.lang);
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/audio/transcriptions`, {
    method: "POST",
    headers: opts.key ? { Authorization: `Bearer ${opts.key}` } : undefined,
    body: form,
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`STT ${response.status}`);
  const data = (await response.json()) as { text?: string };
  if (!data.text) throw new Error("Empty transcript from provider");
  return { text: data.text };
}

async function whisperProvider(req: SttRequest): Promise<{ text: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not configured");
  return openAICompatibleStt(req, "https://api.openai.com", { key, model: "whisper-1" });
}

/** Free self-hosted Whisper (faster-whisper-server / speaches / LocalAI /
 * whisper.cpp server) — point NLE_STT_URL at it, done. */
async function localWhisperProvider(req: SttRequest): Promise<{ text: string }> {
  const url = process.env.NLE_STT_URL;
  if (!url) throw new Error("NLE_STT_URL not configured");
  return openAICompatibleStt(req, url, {
    key: process.env.NLE_STT_KEY,
    model: process.env.NLE_STT_MODEL || "Systran/faster-whisper-large-v3",
  });
}

/** Deterministic provider for demos and E2E tests — no external calls. */
async function echoProvider(req: SttRequest): Promise<{ text: string }> {
  return {
    text: `[echo transcript] ได้รับเสียง ${Math.round(req.audio.length / 1024)} KB (${req.mimeType}) — ต่อ STT จริงด้วย OPENAI_API_KEY`,
  };
}

let activeStt: { name: string; fn: SttProvider } | null = null;

function resolveDefaultStt(): { name: string; fn: SttProvider } {
  if (process.env.NLE_STT_PROVIDER === "echo") return { name: "echo", fn: echoProvider };
  if (process.env.NLE_STT_URL) return { name: "local-whisper", fn: localWhisperProvider };
  return { name: "whisper", fn: whisperProvider };
}

export function setSttProvider(name: string, fn: SttProvider) {
  activeStt = { name, fn };
}

export function getSttProviderName(): string {
  return (activeStt ?? resolveDefaultStt()).name;
}

export async function transcribeAudio(req: SttRequest): Promise<SttResult> {
  const provider = activeStt ?? resolveDefaultStt();
  if (!req.audio || req.audio.length === 0) {
    return { text: null, provider: provider.name, error: "Empty audio payload" };
  }
  if (req.audio.length > MAX_AUDIO_BYTES) {
    return { text: null, provider: provider.name, error: "Audio exceeds 15 MB limit" };
  }
  try {
    const { text } = await provider.fn(req);
    return { text, provider: provider.name };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { text: null, provider: provider.name, error: `STT provider unavailable: ${message}` };
  }
}
