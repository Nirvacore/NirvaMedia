import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const fixture = JSON.parse(readFileSync(join(root, 'tests/fixtures/land-public-guide.json'), 'utf8'));
const load = () => import('../lib/mahasunyata/land-media-handoff.ts');

test('making-amends guide prepares source-bound Thai/English story drafts, never native-approved media', async () => {
  const { prepareLandMediaDraft } = await load();
  for (const language of ['th', 'en']) {
    const input = structuredClone({ ...fixture, language });
    const draft = prepareLandMediaDraft(input);
    assert.equal(draft.guideId, 'making-amends');
    assert.equal(draft.format, 'nirva-media-guide-draft/v1');
    assert.equal('lessonId' in draft, false);
    assert.equal(draft.source.commit, '12f97f05cd2dd3ac889ce4f2fcead5d08608afce');
    assert.equal(draft.status, 'draft');
    assert.equal(draft.publication.status, 'blocked');
    assert.equal(draft.localeReadiness.nativeReview.status, 'pending');
    assert.equal(draft.localeReadiness.voice.status, 'not-prepared');
    assert.equal(draft.localeReadiness.captions.status, 'not-prepared');
    assert.equal(draft.localeReadiness.externalPublishEligible, false);
    assert.deepEqual(draft.content.scenes, fixture.guide.steps.map(step => step[language]));
    assert.ok(draft.content.boundary.includes(fixture.guide.adultNote[language]));
    assert.ok(draft.content.sourceContext.includes(fixture.guide.lenses[2].paragraphs[0][language]));
    assert.equal(draft.content.templateDrafts.length, 6);
    assert.ok(draft.content.templateDrafts.every(t => t.status === 'draft-needs-native-review'));
    assert.ok(!draft.content.narration.includes(fixture.guide.translations[5].text));
    const before = JSON.stringify(draft);
    input.guide.steps[0].th = 'modified'; input.guide.translations[0].text = 'modified';
    assert.equal(JSON.stringify(draft), before);
  }
});

test('guide source changes, private content and approval claims fail before preparation', async () => {
  const { prepareLandMediaDraft } = await load();
  const privateText = 'PRIVATE SYNTHETIC CONFESSION';
  for (const mutate of [
    v => { v.notes = privateText; }, v => { v.containsPrivateNotes = true; },
    v => { v.guide.steps[0].th = privateText; }, v => { v.guide.translations[0].text = privateText; },
    v => { v.guide.translations[0].status = 'approved'; }, v => { v.approved = true; },
    v => { v.editorialSource = v.editorialSource.replace('12f97f05cd2dd3ac889ce4f2fcead5d08608afce', 'main'); },
    v => { v.language = 'ar'; }, v => { v.kind = 'editorial-handoff-not-published'; },
    v => { v.guide.lenses[2].paragraphs = []; }, v => { v.guide.sources[0].url = 'https://example.test'; },
    v => { v.guide.gentleBoundary.th = ''; }, v => { v.guide.adultNote.en = ''; },
  ]) {
    const input = structuredClone(fixture); mutate(input);
    assert.throws(() => prepareLandMediaDraft(input), error => !error.message.includes(privateText));
  }
});

test('existing local CLI accepts the guide and retains template review labels without overwriting', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'land-guide-'));
  try {
    const input = join(tmp, 'guide.json'); const output = join(tmp, 'out');
    writeFileSync(input, JSON.stringify(fixture));
    const run = () => spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/prepare-land-media.mjs', '--input', input, '--output', output], { cwd: root, encoding: 'utf8' });
    const first = run(); assert.equal(first.status, 0, first.stderr);
    const review = readFileSync(join(output, 'review.md'), 'utf8');
    assert.ok(review.includes(fixture.guide.translations[5].text));
    assert.match(review, /draft-needs-native-review/);
    assert.equal(run().status, 1);
    const before = readFileSync(join(output, 'media-draft.json'), 'utf8');
    const bad = structuredClone(fixture); bad.guide.translations[0].text = 'PRIVATE SYNTHETIC CONFESSION';
    writeFileSync(input, JSON.stringify(bad));
    const rejectPath = join(tmp, 'rejected');
    const reject = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/prepare-land-media.mjs', '--input', input, '--output', rejectPath], { cwd: root, encoding: 'utf8' });
    assert.equal(reject.status, 1); assert.equal(existsSync(rejectPath), false);
    assert.doesNotMatch(reject.stdout + reject.stderr, /PRIVATE SYNTHETIC CONFESSION/);
    assert.equal(readFileSync(join(output, 'media-draft.json'), 'utf8'), before);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
