import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { after, beforeEach } from 'node:test';
import { mediaRuntime } from './helpers/media-runtime.mjs';

const runtime = mediaRuntime();
after(() => runtime.close());
const translations = runtime.route('app/api/translations/route.ts');
const remember = runtime.route('app/api/translations/remember/route.ts');
const campaigns = runtime.route('app/api/campaigns/route.ts');
const posts = runtime.route('app/api/posts/[id]/route.ts');
const jobs = runtime.route('app/api/publish-jobs/route.ts');
const concept = JSON.parse(readFileSync(new URL('../lib/mahasunyata/vendor/concepts.json', import.meta.url))).concepts[0];
const provenance = JSON.parse(readFileSync(new URL('../lib/mahasunyata/vendor/source-provenance.json', import.meta.url)));
const association = { concept_id: concept.concept_id, source_concept_version: concept.version };
const input = (extra = {}) => ({ sourceText: 'A policy draft', sourceLanguage: 'en', targetLanguage: 'th', canonical: association, ...extra });
const request = body => new Request('https://example.test/api', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
async function call(handler, body, context) { const response = await handler(request(body), context); return { status: response.status, body: await response.json() }; }
function preserved(value, locale = 'th') {
  assert.ok(value, 'canonical envelope must survive the runtime path');
  assert.equal(value.concept_id, concept.concept_id);
  assert.equal(value.source_concept_version, concept.version);
  assert.equal(value.locale, locale);
  assert.deepEqual(value.canonical_source, concept);
  assert.deepEqual(value.source_provenance, provenance);
  assert.equal(value.semantic_review_status, 'pending');
  assert.equal(value.external_publish_eligible, false);
  assert.equal(value.review_limitation, 'configured-human-review-unavailable');
}
beforeEach(() => {
  for (const table of ['connector_events', 'publish_jobs', 'campaign_posts', 'campaigns', 'translation_memories', 'connector_accounts']) runtime.sqlite.exec(`DELETE FROM ${table}`);
  runtime.provider.result = { status: 'unavailable', providerId: 'test', reason: 'missing_credential' };
});

test('identity localization preserves immutable source envelope without claiming semantic review', async () => {
  const result = await call(translations.POST, input({ targetLanguage: 'en', approved: true, reviewerName: 'Admin' }));
  assert.equal(result.status, 200);
  assert.equal(result.body.translation.text, 'A policy draft');
  preserved(result.body.translation.canonical, 'en');
});

test('translation rejects unknown association, wrong version, unsupported/mismatched locale and source tampering', async () => {
  const corrupt = structuredClone(concept); corrupt.safeguards.en = [];
  for (const canonical of [
    { ...association, source_concept_version: '9.0.0' },
    { concept_id: 'unknown', source_concept_version: '0.1.0' },
    { concept_id: concept.concept_id },
    { ...association, locale: 'xx' },
    { ...association, locale: 'ja' },
    { ...association, canonical_source: corrupt },
    { ...association, source_provenance: { ...provenance, commit: 'tampered' } },
    { ...association, semantic_review_status: 'approved' },
  ]) {
    const result = await call(translations.POST, input({ canonical, targetLanguage: 'en' }));
    assert.equal(result.status, 400, JSON.stringify(canonical));
  }
});

test('provider success and memory hits persist canonical envelope separately from draft text', async () => {
  runtime.provider.result = { status: 'translated', text: 'Localized draft', providerId: 'test', model: 'fixture' };
  const first = await call(translations.POST, input());
  assert.equal(first.status, 200);
  assert.equal(first.body.translation.source, 'provider');
  preserved(first.body.translation.canonical);
  const cached = await call(translations.POST, input());
  assert.equal(cached.body.translation.source, 'memory');
  preserved(cached.body.translation.canonical);
  const listed = await translations.GET(new Request('https://example.test/api'));
  preserved((await listed.json()).memories[0].canonical);
});

test('manual remember and PUT preserve envelope and cannot grant semantic approval or poison generic memory', async () => {
  for (const handler of [remember.POST, translations.PUT]) {
    const result = await call(handler, input({ translatedText: 'Human draft', approved: true, reviewerName: 'Admin' }));
    assert.equal(result.status, 201);
    preserved(result.body.translation.canonical);
    preserved(result.body.memory.canonical);
  }
  const canonicalHit = await call(translations.POST, input());
  preserved(canonicalHit.body.translation.canonical);
  assert.equal(canonicalHit.body.translation.memorySource, 'manual');
  const generic = await call(translations.POST, input({ canonical: undefined }));
  assert.equal(generic.status, 503, 'canonical manual memory must not become generic memory');
});

test('provider unavailable and failure still retain canonical envelope without fabricated text', async () => {
  for (const [providerResult, status] of [
    [{ status: 'unavailable', reason: 'missing_credential' }, 503],
    [{ status: 'failed', reason: 'fixture failure', providerId: 'test' }, 502],
  ]) {
    runtime.provider.result = providerResult;
    const result = await call(translations.POST, input());
    assert.equal(result.status, status);
    assert.equal(result.body.translation.text, null);
    preserved(result.body.translation.canonical);
  }
});

async function createCampaign(canonical = association) {
  const result = await call(campaigns.POST, { brief: 'Policy draft', language: 'th', channels: ['Facebook'], canonical });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  return result.body.campaign.posts[0];
}
const context = id => ({ params: Promise.resolve({ id }) });

test('campaign persistence retains canonical safeguards and real post approval/scheduling/publication fail closed', async () => {
  const post = await createCampaign();
  preserved(post.canonical);
  const listed = await (await campaigns.GET()).json();
  preserved(listed.campaigns[0].posts[0].canonical);
  assert.equal((await call(posts.PATCH, { status: 'review' }, context(post.id))).status, 200);
  for (const [from, payload] of [
    ['review', { status: 'approved', approved: true, reviewerName: 'Admin' }],
    ['approved', { scheduledAt: '2026-10-01T00:00:00Z', canonical: null }],
    ['scheduled', { status: 'published', semantic_review_status: 'approved' }],
  ]) {
    runtime.sqlite.prepare('UPDATE campaign_posts SET status = ? WHERE id = ?').run(from, post.id);
    const result = await call(posts.PATCH, payload, context(post.id));
    assert.equal(result.status, 409);
    assert.equal(result.body.code, 'CANONICAL_HUMAN_REVIEW_REQUIRED');
    assert.equal(runtime.sqlite.prepare('SELECT status FROM campaign_posts WHERE id = ?').get(post.id).status, from);
  }
});

test('publish-jobs resolves stored canonical post even when caller omits association or claims review', async () => {
  const post = await createCampaign();
  runtime.sqlite.prepare("INSERT INTO connector_accounts (id, workspace_id, connector_id, account_name, status, scopes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run('connected-test', 'nirva-workspace', 'meta-network', 'Fixture', 'connected', '[]', 1, 1);
  for (const extra of [{}, { canonical: null }, { approved: true, reviewerName: 'Admin' }]) {
    const result = await call(jobs.POST, { postId: post.id, channel: 'Facebook', ...extra });
    assert.equal(result.status, 409);
    assert.equal(result.body.code, 'CANONICAL_HUMAN_REVIEW_REQUIRED');
  }
  assert.equal(runtime.sqlite.prepare('SELECT COUNT(*) AS count FROM publish_jobs').get().count, 0);
  assert.equal((await call(jobs.POST, { channel: 'Facebook', canonical: association })).status, 409);
  assert.equal((await call(jobs.POST, { channel: 'Facebook', postId: 'unknown' })).status, 404);
});

test('generic translation, campaign approvals and scheduling retain existing behavior', async () => {
  const result = await call(translations.POST, input({ canonical: undefined, targetLanguage: 'en' }));
  assert.equal(result.status, 200);
  assert.equal(result.body.translation.text, 'A policy draft');
  assert.equal(result.body.translation.canonical, undefined);
  const post = await createCampaign(null);
  for (const status of ['review', 'approved', 'scheduled']) {
    assert.equal((await call(posts.PATCH, { status }, context(post.id))).status, 200);
  }
  assert.equal((await call(jobs.POST, { postId: post.id, channel: 'Facebook' })).status, 201);
  assert.equal((await call(jobs.POST, { channel: 'Facebook' })).status, 201);
});

test('the guard uses all 21 existing locales and keeps every returned canonical field immutable', () => {
  const { guardLocalization } = runtime.route('lib/mahasunyata/localization-guard.ts');
  for (const locale of ['th', 'en', 'ja', 'zh', 'ko', 'vi', 'id', 'ms', 'my', 'km', 'lo', 'tl', 'es', 'fr', 'de', 'pt', 'it', 'ru', 'ar', 'he', 'hi']) {
    const envelope = guardLocalization(association, locale);
    preserved(envelope, locale);
    assert.deepEqual(guardLocalization(structuredClone(envelope), locale), envelope);
    assert.throws(() => { envelope.locale = 'xx'; });
    assert.throws(() => envelope.canonical_source.safeguards.en.pop());
    assert.throws(() => { envelope.source_provenance.commit = 'changed'; });
  }
  assert.throws(() => guardLocalization(association, 'xx'));
});

test('remember aliases and campaigns reject safeguard removal, provenance changes and forged review without writes', async () => {
  const { guardLocalization } = runtime.route('lib/mahasunyata/localization-guard.ts');
  for (const mutate of [
    value => { delete value.canonical_source.safeguards; },
    value => { value.canonical_source.not_meaning.en = []; },
    value => { value.canonical_source.meaning.th = []; },
    value => { value.canonical_source.provenance.steward = 'attacker'; },
    value => { value.external_publish_eligible = true; },
    value => { value.semantic_review_status = 'approved'; },
    value => { value.reviewerName = 'Admin'; },
  ]) {
    const canonical = structuredClone(guardLocalization(association, 'th')); mutate(canonical);
    for (const handler of [translations.POST, remember.POST, translations.PUT]) {
      assert.equal((await call(handler, input({ canonical, translatedText: 'draft' }))).status, 400);
    }
    assert.equal((await call(campaigns.POST, { canonical, brief: 'draft', language: 'th', channels: ['Facebook'] })).status, 400);
  }
  assert.equal(runtime.sqlite.prepare('SELECT COUNT(*) AS count FROM translation_memories').get().count, 0);
  assert.equal(runtime.sqlite.prepare('SELECT COUNT(*) AS count FROM campaign_posts').get().count, 0);
});

test('damaged stored Translation Memory never silently restores missing safeguards or accepts manual review flags', async () => {
  await call(remember.POST, input({ translatedText: 'draft' }));
  const stored = JSON.parse(runtime.sqlite.prepare('SELECT canonical FROM translation_memories').get().canonical);
  for (const change of [
    value => { value.canonical_source.safeguards.en = []; },
    value => { value.semantic_review_status = 'approved'; },
  ]) {
    const corrupt = structuredClone(stored); change(corrupt);
    runtime.sqlite.prepare('UPDATE translation_memories SET canonical = ?').run(JSON.stringify(corrupt));
    assert.equal((await call(translations.POST, input())).status, 400);
    assert.equal((await translations.GET(new Request('https://example.test/api'))).status, 400);
  }
});

test('post approval cannot silently ignore an explicitly supplied canonical association on a generic post', async () => {
  const post = await createCampaign(null);
  await call(posts.PATCH, { status: 'review' }, context(post.id));
  const result = await call(posts.PATCH, { status: 'approved', canonical: association }, context(post.id));
  assert.equal(result.status, 409);
  assert.equal(result.body.code, 'CANONICAL_HUMAN_REVIEW_REQUIRED');
});

test('post updates reject attempted canonical reassociation instead of silently dropping it', async () => {
  const post = await createCampaign(null);
  const result = await call(posts.PATCH, { status: 'review', canonical: association }, context(post.id));
  assert.equal(result.status, 400);
  assert.equal(runtime.sqlite.prepare('SELECT status FROM campaign_posts WHERE id = ?').get(post.id).status, 'draft');
});

test('listing memory rejects an incomplete stored canonical envelope', async () => {
  await call(remember.POST, input({ translatedText: 'draft' }));
  const stored = JSON.parse(runtime.sqlite.prepare('SELECT canonical FROM translation_memories').get().canonical);
  delete stored.canonical_source;
  runtime.sqlite.prepare('UPDATE translation_memories SET canonical = ?').run(JSON.stringify(stored));
  assert.equal((await translations.GET(new Request('https://example.test/api'))).status, 400);
});
