import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const fixture = JSON.parse(readFileSync(join(root, 'tests/fixtures/land-public-lesson.json'), 'utf8'));
const adapter = () => import('../lib/mahasunyata/land-media-handoff.ts');

test('public lesson becomes an original-language draft with separate source context and Land lens', async () => {
  const { prepareLandMediaDraft } = await adapter();
  const input = structuredClone(fixture);
  const draft = prepareLandMediaDraft(input);
  assert.equal(draft.status, 'draft');
  assert.deepEqual(draft.publication, { status: 'blocked', reason: 'trusted-editorial-review-unavailable' });
  assert.equal(draft.source.owner, 'nirva-docs');
  assert.equal(draft.source.commit, 'b45b2334548785fd727141c8d0950bb51514aefa');
  assert.equal(draft.source.editorialSource, fixture.editorialSource);
  assert.equal(draft.lessonId, 'emptiness');
  assert.equal(draft.content.title, 'Emptiness that leaves room for care');
  assert.equal(draft.content.sourceContext, fixture.lesson.tradition.en);
  assert.equal(draft.content.landInterpretation, fixture.lesson.lens.en);
  assert.equal(draft.content.boundary, fixture.lesson.boundary.en);
  assert.equal(draft.content.narration, fixture.narration);
  assert.deepEqual(draft.content.scenes, fixture.lesson.scenes.map(scene => scene.en));
  assert.deepEqual(draft.content.sources, fixture.lesson.sources);
  assert.equal(draft.localization, 'selected-existing-language-no-generated-translation');
  input.lesson.sources[0].url = 'https://example.test/changed';
  assert.equal(draft.content.sources[0].url, fixture.lesson.sources[0].url);
});

test('private notes, changed public text and publication flags are rejected without echoing input', async () => {
  const { prepareLandMediaDraft } = await adapter();
  const secret = 'SYNTHETIC PRIVATE NOTE NEVER ACCEPT';
  const mutations = [
    value => value.privateNotes = secret,
    value => value.containsPrivateNotes = true,
    value => value.lesson.reflection = secret,
    value => value.lesson.title.en = secret,
    value => value.lesson.scenes[0].en += secret,
    value => value.lesson.sources[0].url = 'https://example.test/private',
    value => value.narration += secret,
    value => value.kind = 'published',
    value => value.approved = true,
    value => value.language = 'fr',
    value => value.reviewedOn = '2026-09-16',
    value => value.editorialSource = value.editorialSource.replace('b45b2334548785fd727141c8d0950bb51514aefa', 'main'),
    value => value.editorialSource = value.editorialSource.replace('github.com/', 'github.com.evil.test/'),
    value => delete value.containsPrivateNotes,
  ];
  for (const mutate of mutations) {
    const input = structuredClone(fixture); mutate(input);
    assert.throws(() => prepareLandMediaDraft(input), error => {
      assert.doesNotMatch(error.message, /SYNTHETIC PRIVATE NOTE/);
      return true;
    });
  }
});

test('JSON property order does not change the source validation', async () => {
  const { prepareLandMediaDraft } = await adapter();
  function reorder(value) {
    if (Array.isArray(value)) return value.map(reorder);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reorder(item)]));
    return value;
  }
  assert.deepEqual(prepareLandMediaDraft(reorder(fixture)), prepareLandMediaDraft(fixture));
});

test('CLI prepares local review files and refuses an existing destination', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'nirva-land-handoff-'));
  try {
    const input = join(temporary, 'public-packet.json');
    const output = join(temporary, 'prepared');
    writeFileSync(input, JSON.stringify(fixture));
    const run = () => spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/prepare-land-media.mjs', '--input', input, '--output', output], { cwd: root, encoding: 'utf8' });
    const first = run();
    assert.equal(first.status, 0, first.stderr);
    assert.deepEqual(readdirSync(output).sort(), ['media-draft.json', 'narration.txt', 'review.md', 'storyboard.md']);
    const draft = JSON.parse(readFileSync(join(output, 'media-draft.json'), 'utf8'));
    assert.equal(draft.status, 'draft');
    assert.equal(readFileSync(join(output, 'narration.txt'), 'utf8'), fixture.narration + '\n');
    const storyboard = readFileSync(join(output, 'storyboard.md'), 'utf8');
    assert.ok(storyboard.includes(fixture.lesson.scenes[0].en));
    assert.ok(storyboard.includes(fixture.lesson.boundary.en));
    assert.ok(readFileSync(join(output, 'review.md'), 'utf8').includes(fixture.editorialSource));
    const second = run();
    assert.equal(second.status, 1);
    assert.equal(JSON.parse(readFileSync(join(output, 'media-draft.json'), 'utf8')).status, 'draft');
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});

test('CLI rejects a private or oversized input before creating output or logging its contents', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'nirva-land-reject-'));
  try {
    const input = join(temporary, 'packet.json');
    const output = join(temporary, 'must-not-exist');
    for (const contents of [JSON.stringify({ ...fixture, notes: 'SYNTHETIC PRIVATE NOTE' }), 'SYNTHETIC PRIVATE NOTE'.repeat(10000)]) {
      writeFileSync(input, contents);
      const result = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/prepare-land-media.mjs', '--input', input, '--output', output], { cwd: root, encoding: 'utf8' });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Land media preparation failed:/);
      assert.doesNotMatch(result.stderr + result.stdout, /SYNTHETIC PRIVATE NOTE/);
      assert.equal(existsSync(output), false);
    }
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});
