/**
 * Active-site adapter for the 21-language registry from Nirvacore/nirva-AI.
 * Source: server/language/index.ts on claude/nirva-media-nle-vision-h0v1z0.
 * The preserved upstream snapshot stays read-only; this small adapter is what
 * the current Sites application can safely import.
 */

export type NirvaLanguage = {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  rtl: boolean;
};

export const NIRVA_LANGUAGES: readonly NirvaLanguage[] = [
  { code: "th", name: "Thai", nativeName: "ไทย", script: "Thai", rtl: false },
  { code: "en", name: "English", nativeName: "English", script: "Latin", rtl: false },
  { code: "ja", name: "Japanese", nativeName: "日本語", script: "Japanese", rtl: false },
  { code: "zh", name: "Chinese", nativeName: "中文", script: "Han", rtl: false },
  { code: "ko", name: "Korean", nativeName: "한국어", script: "Hangul", rtl: false },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", script: "Latin", rtl: false },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", script: "Latin", rtl: false },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu", script: "Latin", rtl: false },
  { code: "my", name: "Burmese", nativeName: "မြန်မာဘာသာ", script: "Myanmar", rtl: false },
  { code: "km", name: "Khmer", nativeName: "ភាសាខ្មែរ", script: "Khmer", rtl: false },
  { code: "lo", name: "Lao", nativeName: "ພາສາລາວ", script: "Lao", rtl: false },
  { code: "tl", name: "Filipino", nativeName: "Filipino", script: "Latin", rtl: false },
  { code: "es", name: "Spanish", nativeName: "Español", script: "Latin", rtl: false },
  { code: "fr", name: "French", nativeName: "Français", script: "Latin", rtl: false },
  { code: "de", name: "German", nativeName: "Deutsch", script: "Latin", rtl: false },
  { code: "pt", name: "Portuguese", nativeName: "Português", script: "Latin", rtl: false },
  { code: "it", name: "Italian", nativeName: "Italiano", script: "Latin", rtl: false },
  { code: "ru", name: "Russian", nativeName: "Русский", script: "Cyrillic", rtl: false },
  { code: "ar", name: "Arabic", nativeName: "العربية", script: "Arabic", rtl: true },
  { code: "he", name: "Hebrew", nativeName: "עברית", script: "Hebrew", rtl: true },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", script: "Devanagari", rtl: false },
] as const;

export const NIRVA_LANGUAGE_COUNT = NIRVA_LANGUAGES.length;

export function getNirvaLanguage(code: string | undefined) {
  return NIRVA_LANGUAGES.find((language) => language.code === code);
}

export function isSupportedNirvaLanguage(code: string) {
  return Boolean(getNirvaLanguage(code));
}
