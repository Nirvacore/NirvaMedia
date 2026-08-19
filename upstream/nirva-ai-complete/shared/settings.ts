export interface NirvaSettings {
  ollamaUrl: string;
  defaultModel: string;
  qdrantUrl: string;
  n8nUrl: string;
  useOrchestration: boolean;
  maxPremiumPercent: number;
  preferSelfHosted: boolean;
  ttsEnabled: boolean;
  ttsSpeed: number;
  wakeWord: string;
  notifyOnComplete: boolean;
  notifyOnError: boolean;
  obsidianUrl: string;
  obsidianApiKey: string;
  useObsidian: boolean;
  openaiApiKey: string;
  anthropicApiKey: string;
  googleApiKey: string;
  deepseekApiKey: string;
  mistralApiKey: string;
}

export const SETTINGS_STORAGE_KEY = "nirva-settings";

export const DEFAULT_SETTINGS: NirvaSettings = {
  ollamaUrl: "http://localhost:11434",
  defaultModel: "llama3.1:8b",
  qdrantUrl: "http://localhost:6333",
  n8nUrl: "http://localhost:5678",
  useOrchestration: true,
  maxPremiumPercent: 30,
  preferSelfHosted: true,
  ttsEnabled: true,
  ttsSpeed: 1.0,
  wakeWord: "Hey Nirva",
  notifyOnComplete: true,
  notifyOnError: true,
  obsidianUrl: "http://localhost:27124",
  obsidianApiKey: "",
  useObsidian: false,
  openaiApiKey: "",
  anthropicApiKey: "",
  googleApiKey: "",
  deepseekApiKey: "",
  mistralApiKey: "",
};

export function loadSettings(): NirvaSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: NirvaSettings): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
