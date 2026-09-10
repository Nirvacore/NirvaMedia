import { getConcept, sourceProvenance } from './concept-registry';
import type { CanonicalConcept } from './concept-types';
import { isSupportedNirvaLanguage } from '../nle/languages';

export type CanonicalLocalization = Readonly<{
  concept_id: string;
  source_concept_version: string;
  locale: string;
  canonical_source: CanonicalConcept;
  source_provenance: typeof sourceProvenance;
  semantic_review_status: 'pending';
  external_publish_eligible: false;
  review_limitation: 'configured-human-review-unavailable';
}>;

export class CanonicalLocalizationError extends Error {}

function equal(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const a = Object.keys(left); const b = Object.keys(right);
  return a.length === b.length && a.every(key => Object.hasOwn(right, key) &&
    equal((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]));
}

/** Only association fields are required. Echoed source/review fields must match
 * the server envelope exactly. Localized text never overwrites canonical text.
 * This is structural preservation, not a semantic equivalence determination.
 */
export function guardLocalization(value: unknown, locale: string): CanonicalLocalization | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new CanonicalLocalizationError('canonical must be a concept/version association');
  }
  const input = value as Record<string, unknown>;
  if (typeof input.concept_id !== 'string' || typeof input.source_concept_version !== 'string') {
    throw new CanonicalLocalizationError('canonical requires concept_id and exact source_concept_version');
  }
  const concept = getConcept(input.concept_id, input.source_concept_version);
  if (!concept) throw new CanonicalLocalizationError('Unknown canonical concept or source_concept_version');
  if (!isSupportedNirvaLanguage(locale)) throw new CanonicalLocalizationError('Unsupported canonical locale in the 21-language NLE registry');
  const envelope: CanonicalLocalization = Object.freeze({
    concept_id: concept.concept_id,
    source_concept_version: concept.version,
    locale,
    canonical_source: concept,
    source_provenance: sourceProvenance,
    semantic_review_status: 'pending',
    external_publish_eligible: false,
    review_limitation: 'configured-human-review-unavailable',
  });
  for (const key of Object.keys(input)) {
    if (!Object.hasOwn(envelope, key) || !equal(input[key], envelope[key as keyof CanonicalLocalization])) {
      throw new CanonicalLocalizationError(`canonical.${key} does not match the immutable source/review envelope`);
    }
  }
  return envelope;
}

export function canonicalMemoryScope(canonical: CanonicalLocalization | null): string | undefined {
  return canonical ? JSON.stringify([canonical.concept_id, canonical.source_concept_version, sourceProvenance.commit]) : undefined;
}

export function validateMemoryAssociation(stored: unknown, expected: CanonicalLocalization | null): void {
  if (!equal(stored ?? null, expected)) throw new CanonicalLocalizationError('Stored Translation Memory canonical envelope does not match the requested association');
}

/** No trusted human review service exists in this MVP. Block all associated
 * canonical content (including policy/governance); user classification, manual
 * TM entries and client reviewer names cannot weaken this decision. */
export function canonicalPublicationBlock(canonical: unknown): Response | null {
  if (canonical === undefined || canonical === null) return null;
  return Response.json({
    error: 'Canonical content requires trusted human semantic review before approval or publishing',
    code: 'CANONICAL_HUMAN_REVIEW_REQUIRED',
    semantic_review_status: 'pending',
    external_publish_eligible: false,
    review_limitation: 'configured-human-review-unavailable',
  }, { status: 409 });
}
