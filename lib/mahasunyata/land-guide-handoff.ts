import { createHash } from 'node:crypto';
import provenance from './vendor/land-guide-provenance.json' with { type: 'json' };

type Language = 'th' | 'en';
type Words = Record<Language, string>;
type Guide = {
  id: string; title: Words; summary: Words; steps: Words[]; gentleBoundary: Words;
  lenses: { id: string; title: Words; paragraphs: Words[] }[];
  practice: Words[]; adultNote: Words; sources: { title: string; url: string }[];
  translations: { locale: string; name: string; text: string; status: string }[];
};

function invalid(): never { throw new Error('Only an unchanged public Land guide packet from the pinned editorial source is accepted'); }
function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (object(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return JSON.stringify(value);
  return invalid();
}

/** Separate guide format and source pin; never promote it to an approved lesson. */
export function prepareLandGuideDraft(value: unknown) {
  const fields = ['version', 'editorialSource', 'reviewedOn', 'language', 'kind', 'guide', 'containsPrivateNotes'];
  if (!object(value) || Object.keys(value).length !== fields.length || fields.some(key => !Object.hasOwn(value, key)) ||
    value.version !== '1.0.0' || value.kind !== 'editorial-guide-handoff-not-published' || value.containsPrivateNotes !== false ||
    value.editorialSource !== provenance.editorialSource || value.reviewedOn !== provenance.reviewedOn ||
    (value.language !== 'th' && value.language !== 'en')) invalid();
  const serialized = canonicalJson(value.guide);
  const guideSha256 = createHash('sha256').update(serialized).digest('hex');
  if (guideSha256 !== provenance.guideSha256) invalid();
  // Complete hash matching covers nested fields, template status and array order.
  const guide = JSON.parse(serialized) as Guide;
  const language = value.language;
  const lenses = guide.lenses.map(lens => ({ id: lens.id, title: lens.title[language], paragraphs: lens.paragraphs.map(p => p[language]) }));
  const boundary = `${guide.gentleBoundary[language]}\n\n${guide.adultNote[language]}`;
  const scenes = guide.steps.map(step => step[language]);
  const narration = [guide.title[language], guide.summary[language], ...scenes, boundary].join('\n\n');
  const sourceContext = lenses.filter(lens => lens.id === 'buddhist').map(lens => `${lens.title}\n${lens.paragraphs.join('\n\n')}`).join('\n\n');
  const landInterpretation = lenses.filter(lens => lens.id !== 'buddhist').map(lens => `${lens.title}\n${lens.paragraphs.join('\n\n')}`).join('\n\n');
  return {
    format: 'nirva-media-guide-draft/v1', status: 'draft', guideId: guide.id, language,
    publication: { status: 'blocked', reason: 'trusted-editorial-review-unavailable' },
    source: { owner: provenance.owner, repository: provenance.repository, commit: provenance.commit, path: provenance.path,
      editorialSource: provenance.editorialSource, reviewedOn: provenance.reviewedOn, documentSha256: provenance.documentSha256,
      exportSha256: provenance.exportSha256, guideSha256, handoffKind: value.kind },
    localeReadiness: { language, script: { status: 'editorial-draft' }, nativeReview: { status: 'pending' },
      voice: { status: 'not-prepared' }, captions: { status: 'not-prepared' }, externalPublishEligible: false },
    localization: 'selected-existing-language-no-generated-translation', containsPrivateNotes: false,
    content: { title: guide.title[language], summary: guide.summary[language], sourceContext, landInterpretation, lenses,
      boundary, narration, scenes, practice: guide.practice.map(step => step[language]), questions: [], sources: guide.sources,
      templateDrafts: guide.translations },
  };
}
