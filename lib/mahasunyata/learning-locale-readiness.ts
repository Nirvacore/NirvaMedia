import { getNirvaLanguage, NIRVA_LANGUAGES } from '../nle/languages.ts';
import source from './vendor/land-media-provenance.json' with { type: 'json' };

const policy = {
  owner: 'nirva-docs',
  commit: '3ce2139e24dc3cf6cfbabf1fa9c9c025b77fa692',
  url: 'https://github.com/Nirvacore/nirva-docs/blob/3ce2139e24dc3cf6cfbabf1fa9c9c025b77fa692/docs/nirva-global-learning-language-policy.md',
} as const;

/** A digest describes an unverified draft; caller claims never establish review. */
function translationDigest(value: unknown, lessonId: string): string | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid translation draft descriptor');
  const draft = value as Record<string, unknown>;
  if (Object.keys(draft).length !== 3 || ['sourceCommit', 'lessonId', 'contentSha256'].some(key => !Object.hasOwn(draft, key)) ||
      draft.sourceCommit !== source.commit || draft.lessonId !== lessonId ||
      typeof draft.contentSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(draft.contentSha256)) {
    throw new Error('Translation draft must name the exact lesson, source commit and content digest only');
  }
  return draft.contentSha256;
}

export function getLearningLocaleReadiness(lessonId: string, locale: string, translationDraft?: unknown) {
  const language = getNirvaLanguage(locale);
  if (!language) throw new Error('Locale is outside the existing Nirva language registry');
  if (!Object.hasOwn(source.lessonSha256, lessonId)) throw new Error('Unknown public learning lesson');
  const artifactSha256 = translationDigest(translationDraft, lessonId);
  return {
    lessonId, locale, name: language.name, nativeName: language.nativeName,
    writingSystem: language.script, direction: language.rtl ? 'rtl' : 'ltr',
    availableTextLocales: ['th', 'en'],
    registry: 'registered-not-proof-of-content-readiness',
    source: { owner: source.owner, commit: source.commit, editorialSource: source.editorialSource },
    policy: { ...policy },
    script: {
      status: artifactSha256 ? 'translation-draft' : ['th', 'en'].includes(locale) ? 'curated-source-text' : 'translation-required',
      artifactSha256: artifactSha256 ?? null,
      artifactEvidence: artifactSha256 ? 'caller-declared-not-verified' : ['th', 'en'].includes(locale) ? 'pinned-public-source' : 'no-target-language-artifact',
    },
    nativeReview: { status: 'pending', reason: 'trusted-native-review-service-unavailable' },
    voice: { status: 'not-prepared', rights: 'not-verified' },
    captions: { status: 'not-prepared', timingReview: 'not-verified' },
    externalPublishEligible: false,
  };
}

export function listLearningLocaleReadiness(lessonId: string) {
  return NIRVA_LANGUAGES.map(language => getLearningLocaleReadiness(lessonId, language.code));
}
