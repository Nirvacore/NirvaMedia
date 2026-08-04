import { env } from "cloudflare:workers";
import { getNirvaLanguage } from "./languages";

type TranslationProviderBindings = {
  OPENAI_API_KEY?: string;
  OPENAI_TRANSLATION_MODEL?: string;
};

export type ProviderTranslationRequest = {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
};

export type ProviderTranslationResult =
  | { status: "translated"; text: string; providerId: string; model: string }
  | { status: "unavailable"; providerId: string; reason: "missing_credential" }
  | { status: "failed"; providerId: string; reason: string };

export type TranslationProviderStatus = {
  id: string;
  available: boolean;
  status: "active" | "unavailable";
  reason: null | "missing_credential";
};

type OpenAIResponsePayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

const providerId = "openai-responses";

function bindings() {
  return env as unknown as TranslationProviderBindings;
}

export function getTranslationProviderStatus(): TranslationProviderStatus {
  const available = Boolean(bindings().OPENAI_API_KEY?.trim());
  return {
    id: providerId,
    available,
    status: available ? "active" : "unavailable",
    reason: available ? null : "missing_credential",
  };
}

function outputText(payload: OpenAIResponsePayload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text" && content.text?.trim())
    ?.text?.trim();
}

export async function translateWithProvider(
  request: ProviderTranslationRequest,
): Promise<ProviderTranslationResult> {
  const apiKey = bindings().OPENAI_API_KEY?.trim();
  if (!apiKey) return { status: "unavailable", providerId, reason: "missing_credential" };

  const source = getNirvaLanguage(request.sourceLanguage)?.name ?? request.sourceLanguage;
  const target = getNirvaLanguage(request.targetLanguage)?.name ?? request.targetLanguage;
  const model = bindings().OPENAI_TRANSLATION_MODEL?.trim() || "gpt-5-mini";

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        store: false,
        instructions: `Translate from ${source} to ${target}. Preserve meaning, names, numbers, formatting, and links. Return only the translation.`,
        input: request.text,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      return { status: "failed", providerId, reason: `provider_http_${response.status}` };
    }
    const translated = outputText((await response.json()) as OpenAIResponsePayload);
    if (!translated) return { status: "failed", providerId, reason: "empty_provider_response" };
    return { status: "translated", text: translated, providerId, model };
  } catch (error) {
    const reason = error instanceof Error && error.name === "TimeoutError"
      ? "provider_timeout"
      : "provider_request_failed";
    return { status: "failed", providerId, reason };
  }
}
