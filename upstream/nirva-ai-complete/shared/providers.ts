/**
 * LLM Provider Hub — shared types for v0.17
 */

export type CloudProviderId = "openai" | "anthropic" | "google" | "deepseek" | "mistral";

export interface ProviderKeys {
  openai?: string;
  anthropic?: string;
  google?: string;
  deepseek?: string;
  mistral?: string;
}

export interface ProviderHubEntry {
  id: CloudProviderId | "ollama";
  name: string;
  region: string;
  models: string[];
  configured: boolean;
  status: "online" | "offline" | "unconfigured";
  envKey: string;
  settingsKey: keyof ProviderKeys | null;
}

export const PROVIDER_ENV_MAP: Record<CloudProviderId, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  mistral: "MISTRAL_API_KEY",
};

export function mergeProviderKeys(
  fromBody?: Partial<ProviderKeys>,
  fromEnv: ProviderKeys = {}
): ProviderKeys {
  return {
    openai: fromBody?.openai || fromEnv.openai || process.env.OPENAI_API_KEY,
    anthropic: fromBody?.anthropic || fromEnv.anthropic || process.env.ANTHROPIC_API_KEY,
    google: fromBody?.google || fromEnv.google || process.env.GOOGLE_API_KEY,
    deepseek: fromBody?.deepseek || fromEnv.deepseek || process.env.DEEPSEEK_API_KEY,
    mistral: fromBody?.mistral || fromEnv.mistral || process.env.MISTRAL_API_KEY,
  };
}

export function maskKey(key?: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}
