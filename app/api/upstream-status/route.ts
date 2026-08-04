import inventory from "../../../docs/upstream-source-inventory.json";
import { getTranslationProviderStatus } from "../../../lib/nle/translation-provider";

export async function GET() {
  return Response.json({
    ...inventory,
    runtime: {
      translationMemory: "active",
      translationProvider: getTranslationProviderStatus(),
    },
  });
}
