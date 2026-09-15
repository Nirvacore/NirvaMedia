import { createHash } from 'node:crypto';
import provenance from './vendor/land-media-provenance.json' with { type: 'json' };
import { getLearningLocaleReadiness, listLearningLocaleReadiness } from './learning-locale-readiness.ts';

type Language = 'th' | 'en';
type Words = Record<Language, string>;
type Lesson = {
  id: string; symbol: string; title: Words; summary: Words;
  tradition: Words; lens: Words; boundary: Words;
  scenes: Words[]; practice: Words[]; questions: Words[];
  sources: { title: string; url: string }[];
};

function invalid(): never {
  // Never echo untrusted packet text, including rejected private material.
  throw new Error('Only an unchanged public Land lesson packet from the pinned editorial source is accepted');
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (object(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return JSON.stringify(value);
  return invalid();
}

/** Local-only consumer: exact public source matching precedes any media output. */
export function prepareLandMediaDraft(value: unknown) {
  const fields = ['version', 'editorialSource', 'reviewedOn', 'language', 'kind', 'lesson', 'narration', 'containsPrivateNotes'];
  if (!object(value) || Object.keys(value).length !== fields.length || fields.some(key => !Object.hasOwn(value, key)) ||
      value.version !== '1.0.0' || value.editorialSource !== provenance.editorialSource || value.reviewedOn !== provenance.reviewedOn ||
      value.kind !== 'editorial-handoff-not-published' || value.containsPrivateNotes !== false ||
      (value.language !== 'th' && value.language !== 'en') || !object(value.lesson) || typeof value.lesson.id !== 'string') invalid();
  const hashes: Record<string, string> = provenance.lessonSha256;
  const serialized = canonicalJson(value.lesson);
  const lessonSha256 = createHash('sha256').update(serialized).digest('hex');
  if (!Object.hasOwn(hashes, value.lesson.id) || hashes[value.lesson.id] !== lessonSha256) invalid();

  // The hash matches the complete reviewed public lesson, including nested keys.
  // Copy it so caller mutations cannot alter the prepared draft afterward.
  const lesson = JSON.parse(serialized) as Lesson;
  const language = value.language;
  const narration = `${lesson.title[language]}. ${language === 'th' ? 'ต้นทางกล่าวว่า' : 'The source says'}: ${lesson.tradition[language]} ${language === 'th' ? 'มุมมองของ Land' : 'Land’s interpretation'}: ${lesson.lens[language]} ${lesson.boundary[language]}`;
  if (value.narration !== narration) invalid();
  return {
    format: 'nirva-media-learning-draft/v1',
    status: 'draft',
    publication: { status: 'blocked', reason: 'trusted-editorial-review-unavailable' },
    source: {
      owner: provenance.owner, repository: provenance.repository, commit: provenance.commit,
      path: provenance.path, editorialSource: provenance.editorialSource, reviewedOn: provenance.reviewedOn,
      documentSha256: provenance.documentSha256, datasetSha256: provenance.datasetSha256, lessonSha256,
      handoffKind: value.kind,
    },
    lessonId: lesson.id, language,
    localeReadiness: getLearningLocaleReadiness(lesson.id, language),
    localizationTargets: listLearningLocaleReadiness(lesson.id),
    localization: 'selected-existing-language-no-generated-translation',
    containsPrivateNotes: false,
    content: {
      title: lesson.title[language], summary: lesson.summary[language],
      sourceContext: lesson.tradition[language], landInterpretation: lesson.lens[language], boundary: lesson.boundary[language],
      narration, scenes: lesson.scenes.map(scene => scene[language]),
      practice: lesson.practice.map(step => step[language]), questions: lesson.questions.map(question => question[language]),
      sources: lesson.sources,
    },
  };
}
