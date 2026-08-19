import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type NirvaSettings,
} from "@shared/settings";

export { type NirvaSettings, DEFAULT_SETTINGS, loadSettings, saveSettings };

export function getEnvSettings(): Partial<NirvaSettings> {
  return {
    ollamaUrl: import.meta.env.VITE_OLLAMA_URL || undefined,
    defaultModel: import.meta.env.VITE_DEFAULT_MODEL || undefined,
    qdrantUrl: import.meta.env.VITE_QDRANT_URL || undefined,
    n8nUrl: import.meta.env.VITE_N8N_URL || undefined,
  };
}

export function loadClientSettings(): NirvaSettings {
  const stored = loadSettings();
  const env = getEnvSettings();
  return { ...DEFAULT_SETTINGS, ...env, ...stored };
}
