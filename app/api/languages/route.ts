import { NIRVA_LANGUAGE_COUNT, NIRVA_LANGUAGES } from "../../../lib/nle/languages";
import { detectLanguageByScript, localize, LocalizationInputError } from "../../../lib/nle/localization";
import { getTranslationProviderStatus } from "../../../lib/nle/translation-provider";
import { internalErrorResponse } from "../../../lib/api-errors";

// This route uses no storage; the shared helper only shows this message if a
// failure ever reports a missing table or column.
const notReady = "Language Engine is being prepared. Please retry shortly.";
const route = "POST /api/languages";

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
  // Client input errors (a JSON syntax error, or input the localization helper
  // rejects) get fixed 400s that never echo the request body or exception
  // text. Every other failure is internal and gets the shared generic 500.
  try {
    // Read the body first and parse it second: a failure while reading is
    // internal whatever error type the stream reports, and only a syntax
    // error in the bytes the client sent is malformed JSON.
    const bodyText = await request.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyText);
    } catch (error) {
      if (error instanceof SyntaxError) return Response.json({ error: "request body must be valid JSON" }, { status: 400 });
      throw error;
    }
    // JSON that is not an object, including null, has no action.
    const payload = (parsed !== null && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
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
    if (error instanceof LocalizationInputError) {
      return Response.json({ error: "locale, date, currency or timezone is invalid" }, { status: 400 });
    }
    return internalErrorResponse(route, error, notReady);
  }
}
