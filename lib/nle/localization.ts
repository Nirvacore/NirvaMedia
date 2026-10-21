import { getNirvaLanguage } from "./languages";

/**
 * Cloudflare-safe adapter of the provider-free helpers in Nirvacore/nirva-AI
 * shared/language.ts at commit 12b7034. Stateful translation, translation
 * memory, and speech providers deliberately remain outside this adapter.
 */

export type LanguageDetection = {
  language: string | null;
  script: string | null;
  confidence: number;
};

type LocalizationOptions = {
  locale?: string;
  currency?: string;
  timezone?: string;
};

type LocalizationInputField = "locale" | "date" | "currency" | "timezone";

/** Caller-supplied localization input that cannot be used. The message is
 * fixed and never repeats the rejected value, so a caller can answer with a
 * client error without exposing exception text. */
export class LocalizationInputError extends Error {
  readonly field: LocalizationInputField;

  constructor(field: LocalizationInputField) {
    super(`invalid ${field}`);
    this.name = "LocalizationInputError";
    this.field = field;
  }
}

/** Builds an Intl formatter whose options may hold a caller-supplied currency
 * or time zone. Intl rejects a malformed value with a RangeError, which is the
 * caller's input error; a failure with a built-in default stays internal. */
function intlFormatter<T>(field: "currency" | "timezone", supplied: boolean, build: () => T): T {
  try {
    return build();
  } catch (error) {
    if (supplied && error instanceof RangeError) throw new LocalizationInputError(field);
    throw error;
  }
}

const languageDefaults: Record<string, { currency: string; timezone: string }> = {
  th: { currency: "THB", timezone: "Asia/Bangkok" },
  en: { currency: "USD", timezone: "America/New_York" },
  ja: { currency: "JPY", timezone: "Asia/Tokyo" },
  zh: { currency: "CNY", timezone: "Asia/Shanghai" },
  ko: { currency: "KRW", timezone: "Asia/Seoul" },
  vi: { currency: "VND", timezone: "Asia/Ho_Chi_Minh" },
  id: { currency: "IDR", timezone: "Asia/Jakarta" },
  ms: { currency: "MYR", timezone: "Asia/Kuala_Lumpur" },
  my: { currency: "MMK", timezone: "Asia/Yangon" },
  km: { currency: "KHR", timezone: "Asia/Phnom_Penh" },
  lo: { currency: "LAK", timezone: "Asia/Vientiane" },
  tl: { currency: "PHP", timezone: "Asia/Manila" },
  es: { currency: "EUR", timezone: "Europe/Madrid" },
  fr: { currency: "EUR", timezone: "Europe/Paris" },
  de: { currency: "EUR", timezone: "Europe/Berlin" },
  pt: { currency: "BRL", timezone: "America/Sao_Paulo" },
  it: { currency: "EUR", timezone: "Europe/Rome" },
  ru: { currency: "RUB", timezone: "Europe/Moscow" },
  ar: { currency: "SAR", timezone: "Asia/Riyadh" },
  he: { currency: "ILS", timezone: "Asia/Jerusalem" },
  hi: { currency: "INR", timezone: "Asia/Kolkata" },
};

const scriptPatterns: Array<{ pattern: RegExp; script: string; language: string }> = [
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

function toIntlLocale(code: string) {
  const locales: Record<string, string> = {
    th: "th-TH",
    en: "en-US",
    zh: "zh-CN",
    pt: "pt-BR",
    ar: "ar-SA",
    he: "he-IL",
  };
  return locales[code] ?? code;
}

export function detectLanguageByScript(text: string): LanguageDetection {
  const trimmed = text.trim();
  if (!trimmed) return { language: null, script: null, confidence: 0 };

  const letters = trimmed.replace(/[\s\d.,!?;:'"()[\]{}\-–—_/\\@#%^&*+=<>|~`]/g, "");
  if (!letters) return { language: null, script: null, confidence: 0 };

  let best: { script: string; language: string; count: number } | null = null;
  for (const candidate of scriptPatterns) {
    const count = (letters.match(candidate.pattern) ?? []).length;
    if (count > 0 && (!best || count > best.count)) {
      best = { script: candidate.script, language: candidate.language, count };
    }
  }
  if (!best) return { language: null, script: null, confidence: 0 };

  const ratio = best.count / letters.length;
  const confidence = best.script === "Latin" ? Math.min(ratio, 0.5) : ratio;
  return {
    language: best.language,
    script: best.script,
    confidence: Number(confidence.toFixed(2)),
  };
}

export function localize(
  data: { number?: number; currencyAmount?: number; date?: string },
  options: LocalizationOptions = {},
) {
  const locale = options.locale ?? "th";
  const language = getNirvaLanguage(locale);
  if (!language) throw new LocalizationInputError("locale");

  const defaults = languageDefaults[locale];
  const result: {
    locale: string;
    rtl: boolean;
    number?: string;
    currency?: string;
    date?: string;
  } = { locale, rtl: language.rtl };

  if (data.number !== undefined) {
    result.number = new Intl.NumberFormat(toIntlLocale(locale)).format(data.number);
  }
  if (data.currencyAmount !== undefined) {
    const formatter = intlFormatter("currency", options.currency !== undefined, () =>
      new Intl.NumberFormat(toIntlLocale(locale), {
        style: "currency",
        currency: options.currency ?? defaults.currency,
      }));
    result.currency = formatter.format(data.currencyAmount);
  }
  if (data.date !== undefined) {
    const date = new Date(data.date);
    if (Number.isNaN(date.getTime())) throw new LocalizationInputError("date");
    const formatter = intlFormatter("timezone", options.timezone !== undefined, () =>
      new Intl.DateTimeFormat(toIntlLocale(locale), {
        dateStyle: "medium",
        timeZone: options.timezone ?? defaults.timezone,
      }));
    result.date = formatter.format(date);
  }

  return result;
}
