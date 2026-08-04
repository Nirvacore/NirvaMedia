import { NIRVA_LANGUAGE_COUNT, NIRVA_LANGUAGES } from "../../../lib/nle/languages";

export async function GET() {
  return Response.json({
    count: NIRVA_LANGUAGE_COUNT,
    languages: NIRVA_LANGUAGES,
    capabilities: {
      registry: "active",
      curatedStudioCopy: "active",
      rtlLayout: "active",
      providerTranslation: "integration_required",
      translationMemory: "integration_required",
    },
  });
}
