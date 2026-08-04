import { NIRVA_LANGUAGE_COUNT, NIRVA_LANGUAGES } from "../../../lib/nle/languages";
import { detectLanguageByScript, localize } from "../../../lib/nle/localization";
import { getTranslationProviderStatus } from "../../../lib/nle/translation-provider";

export async function GET() {
  const provider = getTranslationProviderStatus();
  return Response.json({
    count: NIRVA_LANGUAGE_COUNT,
    languages: NIRVA_LANGUAGES,
    capabilities: {
      registry: "active",
      curatedStudioCopy: "active",
      rtlLayout: "active",
      scriptDetection: "active",
      intlLocalization: "active",
      providerTranslation: provider.available ? "active" : "unavailable",
      translationMemory: "active",
      speechToText: "integration_required",
    },
    provider,
  });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    if (payload.action === "detect") {
      const text = typeof payload.text === "string" ? payload.text.trim() : "";
      if (!text) return Response.json({ error: "text is required" }, { status: 400 });
      const detection = detectLanguageByScript(text);
      const languageInfo = NIRVA_LANGUAGES.find((language) => language.code === detection.language) ?? null;
      return Response.json({ detection, languageInfo });
    }

    if (payload.action === "localize") {
      const locale = typeof payload.locale === "string" ? payload.locale : "th";
      const number = typeof payload.number === "number" ? payload.number : undefined;
      const currencyAmount = typeof payload.currencyAmount === "number" ? payload.currencyAmount : undefined;
      const date = typeof payload.date === "string" ? payload.date : undefined;
      const currency = typeof payload.currency === "string" ? payload.currency : undefined;
      const timezone = typeof payload.timezone === "string" ? payload.timezone : undefined;
      return Response.json({
        localized: localize(
          { number, currencyAmount, date },
          { locale, currency, timezone },
        ),
      });
    }

    return Response.json({ error: "action must be detect or localize" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 400 });
  }
}
