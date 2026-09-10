export const TRANSLATION_TEXT_LIMIT = 20_000;

export function normalizeTranslationText(text: string) {
  return text.trim();
}

export async function createTranslationMemoryKey(
  sourceLanguage: string,
  targetLanguage: string,
  sourceText: string,
  canonicalScope?: string,
) {
  const value = `${canonicalScope ? `canonical:${canonicalScope}|` : ""}${sourceLanguage.toLowerCase()}|${targetLanguage.toLowerCase()}|${normalizeTranslationText(sourceText)}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
