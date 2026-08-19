/**
 * NLE Nirva Language Engine — shared language registry, detection, and
 * localization helpers (Phase 2). Design: docs/NLE_LANGUAGE_ENGINE_ARCHITECTURE.md
 *
 * Everything here is pure and provider-free: script-based detection and
 * Intl-based localization work offline. LLM-backed translation lives in
 * server/language and goes through a swappable provider.
 */

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  rtl: boolean;
  /** Representative defaults used by localize() when the caller gives none */
  currency: string;
  timezone: string;
}

export const LANGUAGES: LanguageInfo[] = [
  { code: "th", name: "Thai", nativeName: "ไทย", script: "Thai", rtl: false, currency: "THB", timezone: "Asia/Bangkok" },
  { code: "en", name: "English", nativeName: "English", script: "Latin", rtl: false, currency: "USD", timezone: "America/New_York" },
  { code: "ja", name: "Japanese", nativeName: "日本語", script: "Japanese", rtl: false, currency: "JPY", timezone: "Asia/Tokyo" },
  { code: "zh", name: "Chinese", nativeName: "中文", script: "Han", rtl: false, currency: "CNY", timezone: "Asia/Shanghai" },
  { code: "ko", name: "Korean", nativeName: "한국어", script: "Hangul", rtl: false, currency: "KRW", timezone: "Asia/Seoul" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", script: "Latin", rtl: false, currency: "VND", timezone: "Asia/Ho_Chi_Minh" },
  { code: "id", name: "Indonesian", nativeName: "Indonesia", script: "Latin", rtl: false, currency: "IDR", timezone: "Asia/Jakarta" },
  { code: "ms", name: "Malay", nativeName: "Melayu", script: "Latin", rtl: false, currency: "MYR", timezone: "Asia/Kuala_Lumpur" },
  { code: "my", name: "Burmese", nativeName: "မြန်မာ", script: "Myanmar", rtl: false, currency: "MMK", timezone: "Asia/Yangon" },
  { code: "km", name: "Khmer", nativeName: "ខ្មែរ", script: "Khmer", rtl: false, currency: "KHR", timezone: "Asia/Phnom_Penh" },
  { code: "lo", name: "Lao", nativeName: "ລາວ", script: "Lao", rtl: false, currency: "LAK", timezone: "Asia/Vientiane" },
  { code: "tl", name: "Filipino", nativeName: "Filipino", script: "Latin", rtl: false, currency: "PHP", timezone: "Asia/Manila" },
  { code: "es", name: "Spanish", nativeName: "Español", script: "Latin", rtl: false, currency: "EUR", timezone: "Europe/Madrid" },
  { code: "fr", name: "French", nativeName: "Français", script: "Latin", rtl: false, currency: "EUR", timezone: "Europe/Paris" },
  { code: "de", name: "German", nativeName: "Deutsch", script: "Latin", rtl: false, currency: "EUR", timezone: "Europe/Berlin" },
  { code: "pt", name: "Portuguese", nativeName: "Português", script: "Latin", rtl: false, currency: "BRL", timezone: "America/Sao_Paulo" },
  { code: "it", name: "Italian", nativeName: "Italiano", script: "Latin", rtl: false, currency: "EUR", timezone: "Europe/Rome" },
  { code: "ru", name: "Russian", nativeName: "Русский", script: "Cyrillic", rtl: false, currency: "RUB", timezone: "Europe/Moscow" },
  { code: "ar", name: "Arabic", nativeName: "العربية", script: "Arabic", rtl: true, currency: "SAR", timezone: "Asia/Riyadh" },
  { code: "he", name: "Hebrew", nativeName: "עברית", script: "Hebrew", rtl: true, currency: "ILS", timezone: "Asia/Jerusalem" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", script: "Devanagari", rtl: false, currency: "INR", timezone: "Asia/Kolkata" },
];

const BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]));

export function getLanguage(code: string): LanguageInfo | null {
  return BY_CODE.get(code.toLowerCase()) ?? null;
}

export function isRTL(code: string): boolean {
  return getLanguage(code)?.rtl ?? false;
}

export interface DetectionResult {
  language: string | null;
  script: string | null;
  confidence: number;
}

/** Unicode block → language, checked in order. Han comes after kana so
 * Japanese text (which mixes both) resolves to ja. */
const SCRIPT_PATTERNS: Array<{ pattern: RegExp; script: string; language: string }> = [
  { pattern: /[ก-๛]/g, script: "Thai", language: "th" },
  { pattern: /[ກ-ໟ]/g, script: "Lao", language: "lo" },
  { pattern: /[ក-៿]/g, script: "Khmer", language: "km" },
  { pattern: /[က-႟]/g, script: "Myanmar", language: "my" },
  { pattern: /[؀-ۿݐ-ݿ]/g, script: "Arabic", language: "ar" },
  { pattern: /[֐-׿]/g, script: "Hebrew", language: "he" },
  { pattern: /[ऀ-ॿ]/g, script: "Devanagari", language: "hi" },
  { pattern: /[가-힯ᄀ-ᇿ]/g, script: "Hangul", language: "ko" },
  { pattern: /[぀-ヿ]/g, script: "Japanese", language: "ja" },
  { pattern: /[一-鿿]/g, script: "Han", language: "zh" },
  { pattern: /[Ѐ-ӿ]/g, script: "Cyrillic", language: "ru" },
  { pattern: /[A-Za-zÀ-ɏ]/g, script: "Latin", language: "en" },
];

/**
 * Script-based language detection. Deterministic and offline — for Latin
 * scripts it can only say "some Latin language" (returned as en with low
 * confidence); an AI provider can refine this later.
 */
export function detectLanguageByScript(text: string): DetectionResult {
  const trimmed = text.trim();
  if (!trimmed) return { language: null, script: null, confidence: 0 };

  const letters = trimmed.replace(/[\s\d.,!?;:'"()[\]{}\-–—_/\\@#%^&*+=<>|~`]/g, "");
  if (!letters) return { language: null, script: null, confidence: 0 };

  let best: { script: string; language: string; count: number } | null = null;
  for (const { pattern, script, language } of SCRIPT_PATTERNS) {
    const count = (letters.match(pattern) || []).length;
    if (count > 0 && (!best || count > best.count)) {
      best = { script, language, count };
    }
  }
  if (!best) return { language: null, script: null, confidence: 0 };

  const ratio = best.count / letters.length;
  // Latin can't distinguish between en/fr/de/... without an AI pass.
  const confidence = best.script === "Latin" ? Math.min(ratio, 0.5) : ratio;
  return { language: best.language, script: best.script, confidence: Number(confidence.toFixed(2)) };
}

export interface LocalizeOptions {
  locale?: string;
  currency?: string;
  timezone?: string;
}

/** Map our language codes onto BCP-47 locales Intl understands well. */
function toIntlLocale(code: string): string {
  const map: Record<string, string> = { th: "th-TH", en: "en-US", zh: "zh-CN", pt: "pt-BR", ar: "ar-SA", he: "he-IL" };
  return map[code] ?? code;
}

export function formatNumber(value: number, locale = "th"): string {
  return new Intl.NumberFormat(toIntlLocale(locale)).format(value);
}

export function formatCurrency(value: number, opts: LocalizeOptions = {}): string {
  const locale = opts.locale ?? "th";
  const currency = opts.currency ?? getLanguage(locale)?.currency ?? "USD";
  return new Intl.NumberFormat(toIntlLocale(locale), { style: "currency", currency }).format(value);
}

export function formatDate(isoDate: string, opts: LocalizeOptions & { dateStyle?: "full" | "long" | "medium" | "short"; timeStyle?: "full" | "long" | "medium" | "short" } = {}): string {
  const locale = opts.locale ?? "th";
  const timezone = opts.timezone ?? getLanguage(locale)?.timezone ?? "UTC";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${isoDate}`);
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    dateStyle: opts.dateStyle ?? "medium",
    timeStyle: opts.timeStyle,
    timeZone: timezone,
  }).format(date);
}

export interface LocalizedBundle {
  locale: string;
  rtl: boolean;
  number?: string;
  currency?: string;
  date?: string;
}

/** One-call localization used by the /localize endpoint. */
export function localize(data: { number?: number; currencyAmount?: number; date?: string }, opts: LocalizeOptions = {}): LocalizedBundle {
  const locale = opts.locale ?? "th";
  const bundle: LocalizedBundle = { locale, rtl: isRTL(locale) };
  if (data.number !== undefined) bundle.number = formatNumber(data.number, locale);
  if (data.currencyAmount !== undefined) bundle.currency = formatCurrency(data.currencyAmount, opts);
  if (data.date !== undefined) bundle.date = formatDate(data.date, opts);
  return bundle;
}
