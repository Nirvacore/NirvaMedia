import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readiness = () => import('../lib/mahasunyata/learning-locale-readiness.ts');
const source = JSON.parse(readFileSync(new URL('../lib/mahasunyata/vendor/land-media-provenance.json', import.meta.url), 'utf8'));

test('Thai and English have curated text without claiming native review, voice or captions', async () => {
  const { getLearningLocaleReadiness } = await readiness();
  for (const locale of ['th', 'en']) {
    const result = getLearningLocaleReadiness('emptiness', locale);
    assert.equal(result.script.status, 'curated-source-text');
    assert.equal(result.nativeReview.status, 'pending');
    assert.equal(result.voice.status, 'not-prepared');
    assert.equal(result.captions.status, 'not-prepared');
    assert.equal(result.externalPublishEligible, false);
    assert.equal(result.source.commit, source.commit);
  }
});

test('existing global registry supplies script and RTL metadata, not a claim of translated lessons', async () => {
  const { listLearningLocaleReadiness, getLearningLocaleReadiness } = await readiness();
  const matrix = listLearningLocaleReadiness('emptiness');
  assert.equal(matrix.length, 21);
  assert.equal(matrix.filter(item => item.script.status === 'curated-source-text').length, 2);
  const arabic = getLearningLocaleReadiness('emptiness', 'ar');
  assert.equal(arabic.writingSystem, 'Arabic');
  assert.equal(arabic.direction, 'rtl');
  assert.equal(arabic.script.status, 'translation-required');
  assert.deepEqual(arabic.availableTextLocales, ['th', 'en']);
  assert.equal(arabic.script.artifactEvidence, 'no-target-language-artifact');
  assert.equal(getLearningLocaleReadiness('emptiness', 'he').direction, 'rtl');
  assert.equal(getLearningLocaleReadiness('emptiness', 'ja').direction, 'ltr');
  assert.throws(() => getLearningLocaleReadiness('emptiness', 'xx'));
  assert.throws(() => getLearningLocaleReadiness('invented-lesson', 'en'));
});

test('translation descriptor stays draft and cannot carry forged native-review approval', async () => {
  const { getLearningLocaleReadiness } = await readiness();
  const descriptor = { sourceCommit: source.commit, lessonId: 'emptiness', contentSha256: 'a'.repeat(64) };
  const result = getLearningLocaleReadiness('emptiness', 'ar', descriptor);
  assert.equal(result.script.status, 'translation-draft');
  assert.equal(result.script.artifactSha256, descriptor.contentSha256);
  assert.equal(result.nativeReview.status, 'pending');
  assert.equal(result.nativeReview.reason, 'trusted-native-review-service-unavailable');
  assert.equal(result.externalPublishEligible, false);
  for (const mutate of [
    value => value.approved = true,
    value => value.nativeReviewer = 'Claimed reviewer',
    value => value.voice = 'ready',
    value => value.sourceCommit = 'b'.repeat(40),
    value => value.lessonId = 'new-earth',
    value => value.contentSha256 = 'not-a-hash',
    value => value.privateNotes = 'SYNTHETIC PRIVATE NOTE',
  ]) {
    const input = { ...descriptor }; mutate(input);
    assert.throws(() => getLearningLocaleReadiness('emptiness', 'ar', input));
  }
});

test('the real Land draft exposes readiness for further localization', async () => {
  const { prepareLandMediaDraft } = await import('../lib/mahasunyata/land-media-handoff.ts');
  const packet = JSON.parse(readFileSync(new URL('./fixtures/land-public-lesson.json', import.meta.url), 'utf8'));
  const draft = prepareLandMediaDraft(packet);
  assert.equal(draft.localeReadiness.locale, 'en');
  assert.equal(draft.localeReadiness.nativeReview.status, 'pending');
  assert.equal(draft.localizationTargets.find(item => item.locale === 'ar').direction, 'rtl');
  assert.ok(draft.localizationTargets.every(item => item.externalPublishEligible === false));
});
