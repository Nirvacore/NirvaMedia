import { guardLocalization, canonicalMemoryScope, validateMemoryAssociation, CanonicalLocalizationError } from "../../../lib/mahasunyata/localization-guard";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { translationMemories, workspaceEntitlements } from "../../../db/schema";
import { isSupportedNirvaLanguage } from "../../../lib/nle/languages";
import {
  createTranslationMemoryKey,
  normalizeTranslationText,
  TRANSLATION_TEXT_LIMIT,
} from "../../../lib/nle/translation-memory";
import {
  getTranslationProviderStatus,
  translateWithProvider,
} from "../../../lib/nle/translation-provider";
import { productBundles } from "../../../lib/product-catalog";
import { internalErrorResponse } from "../../../lib/api-errors";
import { rememberTranslation } from "./remember/route";

const workspaceId = "nirva-workspace";
const defaultBundle = productBundles.find((bundle) => bundle.id === "enterprise-global")!;

async function hasLanguageEngine() {
  const db = getDb();
  const [entitlement] = await db
    .select()
    .from(workspaceEntitlements)
    .where(eq(workspaceEntitlements.workspaceId, workspaceId))
    .limit(1);
  const moduleIds = entitlement?.moduleIds ?? [...defaultBundle.moduleIds];
  return moduleIds.includes("language-engine");
}

const storageNotReady = "Translation Memory storage is being prepared. Please retry shortly.";

export async function GET(request: Request) {
  try {
    if (!(await hasLanguageEngine())) {
      return Response.json({ error: "Language Engine is not included in the active workspace solution" }, { status: 403 });
    }

    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get("limit") ?? "50");
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
    const sourceLanguage = url.searchParams.get("sourceLanguage")?.trim().toLowerCase();
    const targetLanguage = url.searchParams.get("targetLanguage")?.trim().toLowerCase();
    const conditions = [
      eq(translationMemories.workspaceId, workspaceId),
      eq(translationMemories.status, "active"),
    ];
    if (sourceLanguage) conditions.push(eq(translationMemories.sourceLanguage, sourceLanguage));
    if (targetLanguage) conditions.push(eq(translationMemories.targetLanguage, targetLanguage));

    const db = getDb();
    const memories = await db
      .select()
      .from(translationMemories)
      .where(and(...conditions))
      .orderBy(desc(translationMemories.updatedAt))
      .limit(limit);

    const validatedMemories = memories.map(memory => {
      const canonical = guardLocalization(memory.canonical, memory.targetLanguage);
      validateMemoryAssociation(memory.canonical, canonical);
      return { ...memory, canonical };
    });
    return Response.json({ memories: validatedMemories, provider: getTranslationProviderStatus() });
  } catch (error) {
    if (error instanceof CanonicalLocalizationError) return Response.json({ error: error.message }, { status: 400 });
    return internalErrorResponse("GET /api/translations", error, storageNotReady);
  }
}

export async function POST(request: Request) {
  try {
    if (!(await hasLanguageEngine())) {
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
    const sourceText = typeof payload.sourceText === "string"
      ? normalizeTranslationText(payload.sourceText)
      : "";
    const sourceLanguage = typeof payload.sourceLanguage === "string"
      ? payload.sourceLanguage.trim().toLowerCase()
      : "";
    const targetLanguage = typeof payload.targetLanguage === "string"
      ? payload.targetLanguage.trim().toLowerCase()
      : "";

    if (!sourceText || !sourceLanguage || !targetLanguage) {
      return Response.json(
        { error: "sourceText, sourceLanguage, and targetLanguage are required" },
        { status: 400 },
      );
    }
    if (sourceText.length > TRANSLATION_TEXT_LIMIT) {
      return Response.json({ error: `sourceText exceeds ${TRANSLATION_TEXT_LIMIT} characters` }, { status: 413 });
    }
    if (!isSupportedNirvaLanguage(sourceLanguage) || !isSupportedNirvaLanguage(targetLanguage)) {
      return Response.json({ error: "sourceLanguage and targetLanguage must be supported language codes" }, { status: 400 });
    }
    const canonical = guardLocalization(payload.canonical, targetLanguage);
    const canonicalFields = canonical ? { canonical } : {};
    if (sourceLanguage === targetLanguage) {
      return Response.json({
        translation: {
          ...canonicalFields,
          text: sourceText,
          source: "identity",
          status: "translated",
          cached: false,
        },
      });
    }

    const db = getDb();
    const sourceHash = await createTranslationMemoryKey(sourceLanguage, targetLanguage, sourceText, canonicalMemoryScope(canonical));
    const [memory] = await db
      .select()
      .from(translationMemories)
      .where(
        and(
          eq(translationMemories.workspaceId, workspaceId),
          eq(translationMemories.sourceHash, sourceHash),
          eq(translationMemories.status, "active"),
        ),
      )
      .limit(1);

    if (memory) {
      validateMemoryAssociation(memory.canonical, canonical);
      await db
        .update(translationMemories)
        .set({
          hitCount: sql`${translationMemories.hitCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(translationMemories.id, memory.id));
      return Response.json({
        translation: {
          ...canonicalFields,
          text: memory.translatedText,
          source: "memory",
          status: "translated",
          cached: true,
          memoryId: memory.id,
          memorySource: memory.source,
          provider: memory.providerId,
        },
      });
    }

    const result = await translateWithProvider({ text: sourceText, sourceLanguage, targetLanguage });
    if (result.status === "unavailable") {
      return Response.json(
        {
          translation: { ...canonicalFields, text: null, source: "unavailable", status: "unavailable", cached: false },
          provider: getTranslationProviderStatus(),
          message: "ยังไม่พบคำแปลใน Memory และยังไม่มี Credential สำหรับ Translation Provider",
          error: { code: "TRANSLATION_PROVIDER_UNAVAILABLE", message: "No translation provider credential is configured" },
        },
        { status: 503 },
      );
    }
    if (result.status === "failed") {
      return Response.json(
        {
          translation: { ...canonicalFields, text: null, source: "unavailable", status: "failed", cached: false },
          provider: { id: result.providerId, status: "error" },
          message: "Translation Provider ตอบกลับไม่สำเร็จ และระบบไม่ได้สร้างคำแปลจำลองแทน",
          error: { code: "TRANSLATION_PROVIDER_FAILED", message: result.reason },
        },
        { status: 502 },
      );
    }

    const now = new Date();
    const memoryRow = {
      id: crypto.randomUUID(),
      workspaceId,
      sourceHash,
      sourceLanguage,
      targetLanguage,
      sourceText,
      translatedText: result.text,
      canonical,
      source: "provider" as const,
      providerId: result.providerId,
      status: "active" as const,
      hitCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(translationMemories).values(memoryRow).onConflictDoUpdate({
      target: [translationMemories.workspaceId, translationMemories.sourceHash],
      set: {
        translatedText: memoryRow.translatedText,
        canonical,
        source: memoryRow.source,
        providerId: memoryRow.providerId,
        status: memoryRow.status,
        updatedAt: memoryRow.updatedAt,
      },
    });

    return Response.json({
      translation: {
        ...canonicalFields,
        text: result.text,
        source: "provider",
        status: "translated",
        cached: false,
        provider: result.providerId,
        model: result.model,
      },
    });
  } catch (error) {
    if (error instanceof CanonicalLocalizationError) return Response.json({ error: error.message }, { status: 400 });
    return internalErrorResponse("POST /api/translations", error, storageNotReady);
  }
}

export async function PUT(request: Request) {
  return rememberTranslation(request, "PUT /api/translations");
}
