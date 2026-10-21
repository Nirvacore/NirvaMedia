import { guardLocalization, canonicalMemoryScope, CanonicalLocalizationError } from "../../../../lib/mahasunyata/localization-guard";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { translationMemories, workspaceEntitlements } from "../../../../db/schema";
import { isSupportedNirvaLanguage } from "../../../../lib/nle/languages";
import {
  createTranslationMemoryKey,
  normalizeTranslationText,
  TRANSLATION_TEXT_LIMIT,
} from "../../../../lib/nle/translation-memory";
import { productBundles } from "../../../../lib/product-catalog";
import { internalErrorResponse } from "../../../../lib/api-errors";

const workspaceId = "nirva-workspace";
const defaultBundle = productBundles.find((bundle) => bundle.id === "enterprise-global")!;
const storageNotReady = "Translation Memory storage is being prepared. Please retry shortly.";

/** Shared by POST /api/translations/remember and PUT /api/translations; each
 * entry point passes its own route label for the 500 diagnostic. */
export async function rememberTranslation(request: Request, route: string) {
  try {
    const db = getDb();
    const [entitlement] = await db
      .select()
      .from(workspaceEntitlements)
      .where(eq(workspaceEntitlements.workspaceId, workspaceId))
      .limit(1);
    const moduleIds = entitlement?.moduleIds ?? [...defaultBundle.moduleIds];
    if (!moduleIds.includes("language-engine")) {
      return Response.json({ error: "Language Engine is not included in the active workspace solution" }, { status: 403 });
    }

    // Read the body first and parse it second: a failure while reading is
    // internal whatever error type the stream reports (the 500 below), and
    // only a syntax error in the bytes the client sent is malformed JSON.
    const bodyText = await request.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyText);
    } catch (error) {
      if (error instanceof SyntaxError) return Response.json({ error: "request body must be valid JSON" }, { status: 400 });
      throw error;
    }
    // JSON that is not an object, null included, has none of the required fields.
    const payload = (parsed !== null && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
    const sourceText = typeof payload.sourceText === "string" ? normalizeTranslationText(payload.sourceText) : "";
    const translatedText = typeof payload.translatedText === "string" ? normalizeTranslationText(payload.translatedText) : "";
    const sourceLanguage = typeof payload.sourceLanguage === "string" ? payload.sourceLanguage.trim().toLowerCase() : "";
    const targetLanguage = typeof payload.targetLanguage === "string" ? payload.targetLanguage.trim().toLowerCase() : "";

    if (!sourceText || !translatedText || !sourceLanguage || !targetLanguage) {
      return Response.json(
        { error: "sourceText, translatedText, sourceLanguage, and targetLanguage are required" },
        { status: 400 },
      );
    }
    if (sourceText.length > TRANSLATION_TEXT_LIMIT || translatedText.length > TRANSLATION_TEXT_LIMIT) {
      return Response.json({ error: `translation text exceeds ${TRANSLATION_TEXT_LIMIT} characters` }, { status: 413 });
    }
    if (!isSupportedNirvaLanguage(sourceLanguage) || !isSupportedNirvaLanguage(targetLanguage)) {
      return Response.json({ error: "sourceLanguage and targetLanguage must be supported language codes" }, { status: 400 });
    }

    const canonical = guardLocalization(payload.canonical, targetLanguage);
    const sourceHash = await createTranslationMemoryKey(sourceLanguage, targetLanguage, sourceText, canonicalMemoryScope(canonical));
    const now = new Date();
    const memoryRow = {
      id: crypto.randomUUID(),
      workspaceId,
      sourceHash,
      sourceLanguage,
      targetLanguage,
      sourceText,
      translatedText,
      canonical,
      source: "manual" as const,
      providerId: null,
      status: "active" as const,
      hitCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(translationMemories).values(memoryRow).onConflictDoUpdate({
      target: [translationMemories.workspaceId, translationMemories.sourceHash],
      set: {
        sourceLanguage,
        targetLanguage,
        sourceText,
        translatedText,
        canonical,
        source: "manual",
        providerId: null,
        status: "active",
        updatedAt: now,
      },
    });
    const [memory] = await db
      .select()
      .from(translationMemories)
      .where(
        and(
          eq(translationMemories.workspaceId, workspaceId),
          eq(translationMemories.sourceHash, sourceHash),
        ),
      )
      .limit(1);

    return Response.json(
      {
        memory,
        translation: {
          ...(canonical ? { canonical } : {}),
          text: translatedText,
          source: "memory",
          status: "remembered",
          memorySource: "manual",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CanonicalLocalizationError) return Response.json({ error: error.message }, { status: 400 });
    return internalErrorResponse(route, error, storageNotReady);
  }
}

export async function POST(request: Request) {
  return rememberTranslation(request, "POST /api/translations/remember");
}
