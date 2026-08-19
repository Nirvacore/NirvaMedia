import { INTENT_PIPELINES } from "../../shared/organization.ts";

const DEFAULT_OLLAMA_URL = process.env.VITE_OLLAMA_URL || "http://localhost:11434";
const DEFAULT_MODEL = process.env.ROUTER_MODEL || "llama3.1:8b";

export type ClassifierMethod = "keyword" | "llm";

export interface LLMClassification {
  pipelineId: string;
  confidence: number;
  reasoning?: string;
  method: ClassifierMethod;
}

function buildClassifierPrompt(message: string): string {
  const pipelineList = INTENT_PIPELINES.map(
    (p) => `- ${p.id}: ${p.label} (${p.labelTh}) — keywords: ${p.keywords.slice(0, 5).join(", ")}`
  ).join("\n");

  return `You are DESK, the Nirva AI intent classifier. Pick exactly ONE pipeline id for the user request.

Available pipelines:
${pipelineList}

User request: "${message.replace(/"/g, '\\"')}"

Respond with JSON only:
{"pipelineId":"<id>","confidence":0.85,"reasoning":"<brief reason>"}`;
}

function parseLLMResponse(raw: string): LLMClassification | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as {
      pipelineId?: string;
      confidence?: number;
      reasoning?: string;
    };
    const pipeline = INTENT_PIPELINES.find((p) => p.id === parsed.pipelineId);
    if (!pipeline) return null;
    const confidence = Number(parsed.confidence);
    return {
      pipelineId: pipeline.id,
      confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0.5, confidence)) : 0.75,
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : undefined,
      method: "llm",
    };
  } catch {
    return null;
  }
}

export async function classifyWithLLM(
  message: string,
  options?: { ollamaUrl?: string; model?: string; timeoutMs?: number }
): Promise<LLMClassification | null> {
  const trimmed = message.trim();
  if (!trimmed) return null;

  const url = (options?.ollamaUrl || DEFAULT_OLLAMA_URL).replace(/\/$/, "");
  const model = options?.model || DEFAULT_MODEL;
  const timeoutMs = options?.timeoutMs ?? 12_000;

  try {
    const response = await fetch(`${url}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: buildClassifierPrompt(trimmed),
        stream: false,
        format: "json",
        options: { temperature: 0.1, num_predict: 200 },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as { response?: string };
    if (!data.response) return null;
    return parseLLMResponse(data.response);
  } catch {
    return null;
  }
}

export function getClassifierInfo() {
  return {
    methods: ["keyword", "llm"] as ClassifierMethod[],
    defaultModel: DEFAULT_MODEL,
    defaultOllamaUrl: DEFAULT_OLLAMA_URL,
    pipelines: INTENT_PIPELINES.map((p) => ({
      id: p.id,
      label: p.label,
      labelTh: p.labelTh,
      companyId: p.companyId,
    })),
    description:
      "Keyword classifier is always available. LLM classifier uses Ollama /api/generate with JSON output and falls back to keywords when unavailable.",
  };
}
