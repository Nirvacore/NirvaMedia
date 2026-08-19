/**
 * LLM Provider Hub — unified completion + status checks (v0.17)
 */

import type { ModelCatalogEntry } from "../../shared/model-orchestration.ts";
import type { ModelRouteDecision } from "../../shared/model-orchestration.ts";
import { MODEL_CATALOG } from "../../shared/model-orchestration.ts";
import { resolveOllamaModel } from "../orchestration/index.ts";
import {
  type ProviderKeys,
  type ProviderHubEntry,
  type CloudProviderId,
  mergeProviderKeys,
} from "../../shared/providers.ts";

export type { ProviderKeys };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionResult {
  content: string;
  source: "ollama" | "openai" | "anthropic" | "google" | "deepseek" | "mistral" | "mock";
  model: string;
  provider: string;
}

function getKeyForProvider(provider: string, keys: ProviderKeys): string | undefined {
  if (provider === "openai") return keys.openai;
  if (provider === "anthropic") return keys.anthropic;
  if (provider === "google") return keys.google;
  if (provider === "deepseek") return keys.deepseek;
  if (provider === "ollama") return undefined;
  return undefined;
}

async function completeOllama(
  messages: ChatMessage[],
  model: string,
  ollamaUrl: string
): Promise<CompletionResult> {
  const res = await fetch(`${ollamaUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const data = (await res.json()) as { message: { content: string } };
  return { content: data.message.content, source: "ollama", model, provider: "ollama" };
}

async function completeOpenAI(messages: ChatMessage[], model: string, apiKey: string): Promise<CompletionResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: false }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return { content: data.choices[0]?.message?.content ?? "", source: "openai", model, provider: "openai" };
}

async function completeAnthropic(messages: ChatMessage[], model: string, apiKey: string): Promise<CompletionResult> {
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const chatMessages = messages.filter((m) => m.role !== "system").map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: chatMessages,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { content: Array<{ text: string }> };
  return { content: data.content[0]?.text ?? "", source: "anthropic", model, provider: "anthropic" };
}

async function completeGoogle(messages: ChatMessage[], model: string, apiKey: string): Promise<CompletionResult> {
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  const systemInstruction = messages.find((m) => m.role === "system")?.content;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Google ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return { content: text, source: "google", model, provider: "google" };
}

async function completeDeepSeek(messages: ChatMessage[], model: string, apiKey: string): Promise<CompletionResult> {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: false }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return { content: data.choices[0]?.message?.content ?? "", source: "deepseek", model, provider: "deepseek" };
}

async function completeWithCatalogEntry(
  entry: ModelCatalogEntry,
  messages: ChatMessage[],
  keys: ProviderKeys,
  ollamaUrl: string
): Promise<CompletionResult> {
  const apiKey = getKeyForProvider(entry.provider, keys);

  if (entry.provider === "ollama" || !apiKey) {
    const tag = entry.ollamaTag || "llama3.1:8b";
    return completeOllama(messages, tag, ollamaUrl);
  }

  const apiModel = entry.apiModel || entry.id;

  if (entry.provider === "openai") return completeOpenAI(messages, apiModel, apiKey);
  if (entry.provider === "anthropic") return completeAnthropic(messages, apiModel, apiKey);
  if (entry.provider === "google") return completeGoogle(messages, apiModel, apiKey);
  if (entry.provider === "deepseek") return completeDeepSeek(messages, apiModel, apiKey);

  const tag = entry.ollamaTag || "llama3.1:8b";
  return completeOllama(messages, tag, ollamaUrl);
}

/** Route completion through MODEL_CATALOG entry with Ollama fallback */
export async function completeChat(opts: {
  decision: ModelRouteDecision;
  messages: ChatMessage[];
  keys?: ProviderKeys;
  ollamaUrl: string;
  fallbackModel?: string;
}): Promise<CompletionResult> {
  const keys = mergeProviderKeys(opts.keys);
  const { decision, messages, ollamaUrl } = opts;

  try {
    return await completeWithCatalogEntry(decision.model, messages, keys, ollamaUrl);
  } catch (cloudErr) {
    const ollamaTag = resolveOllamaModel(decision, opts.fallbackModel || "llama3.1:8b");
    try {
      const result = await completeOllama(messages, ollamaTag, ollamaUrl);
      return { ...result, content: result.content };
    } catch {
      throw cloudErr;
    }
  }
}

/** Direct completion by explicit model id from catalog */
export async function completeWithModelId(opts: {
  modelId: string;
  messages: ChatMessage[];
  keys?: ProviderKeys;
  ollamaUrl: string;
}): Promise<CompletionResult> {
  const entry = MODEL_CATALOG.find((m) => m.id === opts.modelId);
  if (!entry) throw new Error(`Unknown model: ${opts.modelId}`);
  return completeWithCatalogEntry(entry, opts.messages, mergeProviderKeys(opts.keys), opts.ollamaUrl);
}

export async function testProvider(
  providerId: CloudProviderId,
  apiKey: string
): Promise<{ ok: boolean; message: string }> {
  const probe: ChatMessage[] = [
    { role: "user", content: "Reply with exactly: OK" },
  ];
  try {
    let result: CompletionResult;
    if (providerId === "openai") result = await completeOpenAI(probe, "gpt-4o-mini", apiKey);
    else if (providerId === "anthropic") result = await completeAnthropic(probe, "claude-sonnet-4-20250514", apiKey);
    else if (providerId === "google") result = await completeGoogle(probe, "gemini-2.0-flash", apiKey);
    else if (providerId === "deepseek") result = await completeDeepSeek(probe, "deepseek-chat", apiKey);
    else return { ok: false, message: "Provider not implemented" };
    return { ok: result.content.length > 0, message: result.content.slice(0, 80) || "OK" };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function getProviderHub(keys?: ProviderKeys, ollamaUrl?: string): Promise<ProviderHubEntry[]> {
  const merged = mergeProviderKeys(keys);
  const ollamaOnline = ollamaUrl
    ? await fetch(`${ollamaUrl.replace(/\/$/, "")}/api/tags`, { signal: AbortSignal.timeout(3000) })
        .then((r) => r.ok)
        .catch(() => false)
    : false;

  const cloudProviders: Array<{
    id: CloudProviderId;
    name: string;
    region: string;
    models: string[];
    settingsKey: keyof ProviderKeys;
  }> = [
    { id: "openai", name: "OpenAI", region: "🇺🇸 USA", models: ["gpt-4o", "gpt-4o-mini", "o1-mini"], settingsKey: "openai" },
    { id: "anthropic", name: "Anthropic", region: "🇺🇸 USA", models: ["claude-sonnet-4", "claude-opus-4"], settingsKey: "anthropic" },
    { id: "google", name: "Google Gemini", region: "🇺🇸 USA", models: ["gemini-2.0-flash", "gemini-2.0-pro"], settingsKey: "google" },
    { id: "deepseek", name: "DeepSeek", region: "🇨🇳 China", models: ["deepseek-chat", "deepseek-coder"], settingsKey: "deepseek" },
    { id: "mistral", name: "Mistral AI", region: "🇪🇺 Europe", models: ["mistral-large", "codestral"], settingsKey: "mistral" },
  ];

  const entries: ProviderHubEntry[] = [
    {
      id: "ollama",
      name: "Ollama (Self-Hosted)",
      region: "🏠 Local",
      models: ["llama3.1:8b", "qwen2.5:14b", "deepseek-coder"],
      configured: true,
      status: ollamaOnline ? "online" : "offline",
      envKey: "VITE_OLLAMA_URL",
      settingsKey: null,
    },
  ];

  for (const p of cloudProviders) {
    const key = merged[p.settingsKey];
    entries.push({
      id: p.id,
      name: p.name,
      region: p.region,
      models: p.models,
      configured: Boolean(key),
      status: key ? "online" : "unconfigured",
      envKey: `${p.id.toUpperCase()}_API_KEY`,
      settingsKey: p.settingsKey,
    });
  }

  return entries;
}
