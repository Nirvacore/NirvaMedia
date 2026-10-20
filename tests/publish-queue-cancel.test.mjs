import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { after, beforeEach } from 'node:test';
import { mediaRuntime } from './helpers/media-runtime.mjs';

// Synthetic data only: no OAuth, no connector calls, no external posting.
const runtime = mediaRuntime();
after(() => runtime.close());
const campaigns = runtime.route('app/api/campaigns/route.ts');
const posts = runtime.route('app/api/posts/[id]/route.ts');
const jobs = runtime.route('app/api/publish-jobs/route.ts');
// Loaded lazily so each test reports its own failure before the feature exists.
const cancelRoute = () => runtime.route('app/api/publish-jobs/[id]/cancel/route.ts');
const queue = () => runtime.route('lib/publish-queue.ts');
const db = () => runtime.route('db/index.ts').getDb();

const whenIso = '2026-10-20T02:30:00.000Z';
const request = body => new Request('https://example.test/api', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
async function call(handler, body, context) { const response = await handler(request(body), context); return { status: response.status, body: await response.json() }; }
const context = id => ({ params: Promise.resolve({ id }) });
const cancel = (jobId, body) => call(cancelRoute().POST, body, context(jobId));
const count = table => runtime.sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
const row = (table, id) => ({ ...runtime.sqlite.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) });
const events = type => runtime.sqlite.prepare('SELECT * FROM connector_events WHERE event_type = ? ORDER BY created_at, id').all(type).map(event => ({ ...event, payload: JSON.parse(event.payload) }));
const entitle = (moduleIds, connectorIds) => runtime.sqlite
  .prepare("INSERT OR REPLACE INTO workspace_entitlements (workspace_id, workspace_name, module_ids, connector_ids, status, activated_at, updated_at) VALUES ('nirva-workspace', 'Nirva Workspace', ?, ?, 'active', 1, 1)")
  .run(JSON.stringify(moduleIds), JSON.stringify(connectorIds));
const connect = () => runtime.sqlite
  .prepare("INSERT INTO connector_accounts (id, workspace_id, connector_id, account_name, status, scopes, created_at, updated_at) VALUES ('meta', 'nirva-workspace', 'meta-network', 'Synthetic', 'connected', '[]', 1, 1)")
  .run();

beforeEach(() => {
  for (const table of ['connector_events', 'publish_jobs', 'campaign_posts', 'campaigns', 'connector_accounts', 'workspace_entitlements']) runtime.sqlite.exec(`DELETE FROM ${table}`);
});

// A generic approved post scheduled through the real queue route.
async function scheduledPost() {
  const created = await call(campaigns.POST, { brief: 'Synthetic launch', language: 'en', channels: ['Facebook'] });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const post = created.body.campaign.posts[0];
  for (const status of ['review', 'approved']) assert.equal((await call(posts.PATCH, { status }, context(post.id))).status, 200);
  const scheduled = await call(jobs.POST, { postId: post.id, channel: 'Facebook', scheduledAt: whenIso });
  assert.equal(scheduled.status, 201, JSON.stringify(scheduled.body));
  return { post, job: scheduled.body.job };
}

// Runs `change` just before the route prepares its first matching statement,
// as a concurrent writer committing between the route's reads and its batch.
function beforeWrite(pattern, change) {
  const prepare = runtime.sqlite.prepare;
  runtime.sqlite.prepare = function (sql) {
    if (pattern.test(sql)) { delete runtime.sqlite.prepare; change(); }
    return prepare.call(this, sql);
  };
}
// Runs `change` right after the first statement matching `pattern` executes:
// a concurrent writer committing between two reads of the same response.
// Returns a probe that reports whether the interleaving happened.
function afterRead(pattern, change) {
  const prepare = runtime.sqlite.prepare;
  const probe = { fired: false };
  runtime.sqlite.prepare = function (sql) {
    const statement = prepare.call(this, sql);
    if (!pattern.test(sql)) return statement;
    delete runtime.sqlite.prepare;
    return {
      setReturnArrays: value => statement.setReturnArrays(value),
      all: (...args) => { const rows = statement.all(...args); probe.fired = true; change(); return rows; },
      run: (...args) => statement.run(...args),
    };
  };
  return probe;
}
// For generic posts the queue keeps scheduled <=> linked job; a response that
// mixes two moments breaks that pairing.
function assertConsistentPost(post) {
  if (post.status === 'scheduled') {
    assert.ok(post.publishJob, `scheduled post must carry its linked job: ${JSON.stringify(post)}`);
    assert.ok(post.scheduledAt);
  } else {
    assert.equal(post.publishJob, null, `${post.status} post cannot carry a linked job: ${JSON.stringify(post)}`);
  }
}
const scheduleDirectly = (postId, jobId, at = '2026-10-22T00:00:00.000Z') => {
  runtime.sqlite.prepare("UPDATE campaign_posts SET status = 'scheduled', scheduled_at = ? WHERE id = ?").run(at, postId);
  runtime.sqlite.prepare("INSERT INTO publish_jobs (id, workspace_id, post_id, channel, status, scheduled_at, attempts, created_at, updated_at) VALUES (?, 'nirva-workspace', ?, 'Facebook', 'blocked_auth', ?, 0, 1, 1)").run(jobId, postId, Date.parse(at));
};
// The worker claim is the product's own claim statement, executed synchronously.
function claimNow(jobId, expectedAttempts = 0) {
  const { sql, params } = queue().claimPublishJobQuery(db(), jobId, expectedAttempts).toSQL();
  return runtime.sqlite.prepare(sql).all(...params).length === 1;
}
const unchanged = (post, job, extra = {}) => {
  assert.deepEqual({ status: row('campaign_posts', post.id).status, scheduled_at: row('campaign_posts', post.id).scheduled_at }, { status: 'scheduled', scheduled_at: whenIso });
  const stored = row('publish_jobs', job.id);
  assert.equal(stored.post_id, post.id, 'the job stays linked to its post');
  if (!('status' in extra)) assert.notEqual(stored.status, 'cancelled');
  for (const [key, value] of Object.entries(extra)) assert.equal(stored[key], value, key);
  assert.equal(events('publish_job.cancelled').length, 0);
};

test('cancelling a blocked_auth job returns the post to approved, detaches the job and audits it', async () => {
  const { post, job } = await scheduledPost();
  const result = await cancel(job.id, { postId: post.id });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.cancelled, true);
  assert.equal(result.body.post.status, 'approved');
  assert.equal(result.body.post.scheduledAt, null);
  assert.equal(result.body.job.status, 'cancelled');
  assert.equal(result.body.job.postId, null);
  const storedPost = row('campaign_posts', post.id);
  assert.deepEqual({ status: storedPost.status, scheduled_at: storedPost.scheduled_at }, { status: 'approved', scheduled_at: null });
  const storedJob = row('publish_jobs', job.id);
  assert.equal(storedJob.status, 'cancelled');
  assert.equal(storedJob.post_id, null);
  assert.equal(storedJob.attempts, 0);
  assert.equal(storedJob.scheduled_at, Date.parse(whenIso), 'the cancelled job keeps its original time');
  assert.match(storedJob.last_error, new RegExp(`before any external publish attempt.*${post.id}`));
  const [event] = events('publish_job.cancelled');
  assert.equal(events('publish_job.cancelled').length, 1);
  assert.deepEqual(event.payload, {
    publishJobId: job.id, postId: post.id, channel: 'Facebook', connectorId: 'meta-network',
    scheduledAt: whenIso, jobStatusFrom: 'blocked_auth', postStatusFrom: 'scheduled', postStatusTo: 'approved', externalAttempts: 0,
  });
});

test('a cancelled post can be scheduled again; a queued job on a connected account cancels the same way', async () => {
  connect();
  const { post, job } = await scheduledPost();
  assert.equal(job.status, 'queued');
  assert.equal((await cancel(job.id, { postId: post.id })).status, 200);
  assert.equal(events('publish_job.cancelled')[0].payload.jobStatusFrom, 'queued');
  assert.equal(events('publish_job.cancelled')[0].connector_account_id, 'meta');
  const again = await call(jobs.POST, { postId: post.id, channel: 'Facebook', scheduledAt: '2026-10-22T00:00:00.000Z' });
  assert.equal(again.status, 201, 'the unique post guard only counts the active job');
  assert.notEqual(again.body.job.id, job.id);
  assert.equal(count('publish_jobs'), 2);
});

test('retrying a cancel replays it without another write', async () => {
  const { post, job } = await scheduledPost();
  const first = await cancel(job.id, { postId: post.id });
  assert.equal(first.body.post.publishJob, null, 'the post reports that no job is linked any more');
  const retry = await cancel(job.id, { postId: post.id });
  assert.equal(retry.status, 200);
  assert.equal(retry.body.replayed, true);
  assert.equal(retry.body.job.status, 'cancelled');
  assert.equal(retry.body.post.status, 'approved');
  assert.equal(retry.body.post.publishJob, null);
  assert.deepEqual(retry.body.job, first.body.job);
  assert.equal(events('publish_job.cancelled').length, 1);
});

test('retrying an old cancel after the post was scheduled again reports the new job and leaves it alone', async () => {
  const { post, job: oldJob } = await scheduledPost();
  assert.equal((await cancel(oldJob.id, { postId: post.id })).status, 200);
  const rescheduled = await call(jobs.POST, { postId: post.id, channel: 'Facebook', scheduledAt: '2026-10-22T00:00:00.000Z' });
  assert.equal(rescheduled.status, 201);
  const newJob = rescheduled.body.job;
  const retry = await cancel(oldJob.id, { postId: post.id });
  assert.equal(retry.status, 200);
  assert.equal(retry.body.cancelled, true, 'the old job really was cancelled');
  assert.equal(retry.body.replayed, true);
  assert.equal(retry.body.job.id, oldJob.id);
  assert.equal(retry.body.job.status, 'cancelled');
  assert.equal(retry.body.post.status, 'scheduled', 'the post is reported as it is now');
  assert.equal(retry.body.post.scheduledAt, '2026-10-22T00:00:00.000Z');
  assert.deepEqual(retry.body.post.publishJob, { id: newJob.id, status: 'blocked_auth' }, 'the new job stays visible');
  const stored = row('publish_jobs', newJob.id);
  assert.deepEqual({ status: stored.status, post_id: stored.post_id, attempts: stored.attempts }, { status: 'blocked_auth', post_id: post.id, attempts: 0 });
  assert.equal(row('campaign_posts', post.id).status, 'scheduled');
  assert.equal(events('publish_job.cancelled').length, 1, 'the retry writes nothing');
});

test('the claim contract: only an unclaimed queued job can be claimed, once', async () => {
  const blocked = await scheduledPost();
  assert.equal(await queue().claimPublishJob(db(), blocked.job.id, 0), false, 'blocked_auth jobs have no account to publish with');
  runtime.sqlite.exec('DELETE FROM publish_jobs'); runtime.sqlite.exec('DELETE FROM campaign_posts'); connect();
  const { job } = await scheduledPost();
  assert.equal(await queue().claimPublishJob(db(), job.id, 0), true);
  assert.equal(await queue().claimPublishJob(db(), job.id, 0), false, 'a stale claim cannot start a second attempt');
  assert.equal(row('publish_jobs', job.id).attempts, 1);
  assert.equal(row('publish_jobs', job.id).status, 'publishing');
});

test('a fresh attempt count cannot claim a job while its first attempt is in flight', async () => {
  connect();
  const { job } = await scheduledPost();
  assert.equal(await queue().claimPublishJob(db(), job.id, 0), true);
  assert.equal(await queue().claimPublishJob(db(), job.id, 1), false, 'an in-flight attempt keeps the job reserved');
  const stored = row('publish_jobs', job.id);
  assert.equal(stored.attempts, 1);
  assert.equal(stored.status, 'publishing');
});

test('a job a worker has claimed, or that left the internal queue, cannot be cancelled', async () => {
  connect();
  const claimed = await scheduledPost();
  assert.equal(await queue().claimPublishJob(db(), claimed.job.id, 0), true);
  const refused = await cancel(claimed.job.id, { postId: claimed.post.id });
  assert.equal(refused.status, 409);
  assert.equal(refused.body.code, 'JOB_NOT_CANCELLABLE');
  assert.equal(refused.body.job.attempts, 1);
  assert.deepEqual(refused.body.post.publishJob, { id: claimed.job.id, status: 'publishing' }, 'conflicts also carry the linked job');
  unchanged(claimed.post, claimed.job, { attempts: 1, status: 'publishing' });
  for (const status of ['published', 'failed', 'cancelled']) {
    runtime.sqlite.exec('DELETE FROM publish_jobs'); runtime.sqlite.exec('DELETE FROM campaign_posts');
    const { post, job } = await scheduledPost();
    runtime.sqlite.prepare('UPDATE publish_jobs SET status = ? WHERE id = ?').run(status, job.id);
    const result = await cancel(job.id, { postId: post.id });
    assert.equal(result.status, 409, status);
    assert.equal(result.body.code, 'JOB_NOT_CANCELLABLE', status);
    unchanged(post, job, { status });
  }
});

test('cancel requires the linked post, Smart Publisher and the connector entitlement, and writes nothing otherwise', async () => {
  const { post, job } = await scheduledPost();
  const other = await scheduledPost();
  for (const [jobId, body, status, code] of [
    [job.id, {}, 400],
    ['missing-job', { postId: post.id }, 404],
    [job.id, { postId: other.post.id }, 409, 'JOB_NOT_CANCELLABLE'],
  ]) {
    const result = await cancel(jobId, body);
    assert.equal(result.status, status, JSON.stringify(body));
    if (code) assert.equal(result.body.code, code);
  }
  entitle([], ['meta-network']);
  const moduleBlocked = await cancel(job.id, { postId: post.id });
  assert.equal(moduleBlocked.status, 403);
  assert.equal(moduleBlocked.body.code, 'MODULE_NOT_ENTITLED');
  entitle(['smart-publisher'], ['line-ecosystem']);
  assert.equal((await cancel(job.id, { postId: post.id })).status, 403);
  unchanged(post, job);
  unchanged(other.post, other.job);
});

test('canonical posts stay fail-closed: cancel cannot move them to approved', async () => {
  const { post, job } = await scheduledPost();
  const concept = JSON.parse(readFileSync(new URL('../lib/mahasunyata/vendor/concepts.json', import.meta.url))).concepts[0];
  runtime.sqlite.prepare('UPDATE campaign_posts SET canonical = ? WHERE id = ?')
    .run(JSON.stringify({ concept_id: concept.concept_id, source_concept_version: concept.version }), post.id);
  const result = await cancel(job.id, { postId: post.id });
  assert.equal(result.status, 409);
  assert.equal(result.body.code, 'CANONICAL_HUMAN_REVIEW_REQUIRED');
  unchanged(post, job);
});

test('a worker claim that lands before the cancel batch wins, and the cancel writes nothing', async () => {
  connect();
  const { post, job } = await scheduledPost();
  let claimed;
  beforeWrite(/^insert into "connector_events"/, () => { claimed = claimNow(job.id); });
  const result = await cancel(job.id, { postId: post.id });
  assert.equal(claimed, true);
  assert.equal(result.status, 409);
  assert.equal(result.body.code, 'JOB_NOT_CANCELLABLE');
  assert.equal(result.body.job.attempts, 1);
  unchanged(post, job, { attempts: 1, status: 'publishing' });
});

test('a cancel that commits first makes the worker claim fail, so no attempt can start', async () => {
  connect();
  const { post, job } = await scheduledPost();
  assert.equal((await cancel(job.id, { postId: post.id })).status, 200);
  assert.equal(await queue().claimPublishJob(db(), job.id, 0), false);
  assert.equal(row('publish_jobs', job.id).attempts, 0);
  assert.equal(row('publish_jobs', job.id).status, 'cancelled');
});

test('a cancel racing a post change or a second cancel writes exactly once', async () => {
  const { post, job } = await scheduledPost();
  const results = await Promise.all([cancel(job.id, { postId: post.id }), cancel(job.id, { postId: post.id })]);
  assert.deepEqual(results.map(result => result.status), [200, 200]);
  assert.deepEqual(results.map(result => !!result.body.replayed).sort(), [false, true]);
  assert.equal(events('publish_job.cancelled').length, 1);
  const second = await scheduledPost();
  beforeWrite(/^insert into "connector_events"/, () => runtime.sqlite.prepare("UPDATE campaign_posts SET status = 'archived' WHERE id = ?").run(second.post.id));
  const stale = await cancel(second.job.id, { postId: second.post.id });
  assert.equal(stale.status, 409);
  assert.equal(row('campaign_posts', second.post.id).status, 'archived');
  assert.equal(row('publish_jobs', second.job.id).status, 'blocked_auth');
  assert.equal(events('publish_job.cancelled').length, 1);
});

test('after cancel, campaign history shows an approved post with no queue job and post updates work again', async () => {
  const { post, job } = await scheduledPost();
  await cancel(job.id, { postId: post.id });
  const listed = (await (await campaigns.GET()).json()).campaigns.flatMap(campaign => campaign.posts).find(item => item.id === post.id);
  assert.equal(listed.status, 'approved');
  assert.equal(listed.scheduledAt, null);
  assert.equal(listed.publishJob, null);
  assert.equal((await call(posts.PATCH, { status: 'archived' }, context(post.id))).status, 200);
  const queueList = (await (await jobs.GET()).json()).jobs;
  assert.equal(queueList.find(item => item.id === job.id).status, 'cancelled', 'the queue keeps the cancelled record');
});

// The readback must not be splittable at either read: after the post row is
// read, or after the post's linked job is read (whichever comes first).
const readbackPoints = [
  ['after the post read', /from "campaign_posts"/],
  ['after the linked-job read', /"publish_jobs"\."post_id" = /],
];
const cancelEventsFor = jobId => events('publish_job.cancelled').filter(event => event.payload.publishJobId === jobId).length;

test('a replay readback is one snapshot: a schedule landing between reads cannot pair approved with the new job', async () => {
  for (const [point, pattern] of readbackPoints) {
    const { post, job } = await scheduledPost();
    assert.equal((await cancel(job.id, { postId: post.id })).status, 200);
    const newJobId = `job-new-${point.length}`;
    const probe = afterRead(pattern, () => scheduleDirectly(post.id, newJobId));
    const retry = await cancel(job.id, { postId: post.id });
    assert.equal(probe.fired, true, `the schedule landed ${point}`);
    assert.equal(retry.status, 200, point);
    assert.equal(retry.body.replayed, true, point);
    assertConsistentPost(retry.body.post);
    assert.equal(row('publish_jobs', newJobId).post_id, post.id, 'the new job is untouched');
    assert.equal(cancelEventsFor(job.id), 1, point);
  }
});

test('a retried old cancel reads one snapshot: cancelling the new job between reads cannot pair scheduled with no job', async () => {
  for (const [point, pattern] of readbackPoints) {
    const { post, job: oldJob } = await scheduledPost();
    await cancel(oldJob.id, { postId: post.id });
    const rescheduled = await call(jobs.POST, { postId: post.id, channel: 'Facebook', scheduledAt: '2026-10-22T00:00:00.000Z' });
    assert.equal(rescheduled.status, 201);
    const probe = afterRead(pattern, () => {
      runtime.sqlite.prepare("UPDATE campaign_posts SET status = 'approved', scheduled_at = NULL WHERE id = ?").run(post.id);
      runtime.sqlite.prepare("UPDATE publish_jobs SET status = 'cancelled', post_id = NULL WHERE id = ?").run(rescheduled.body.job.id);
    });
    const retry = await cancel(oldJob.id, { postId: post.id });
    assert.equal(probe.fired, true, `the new job was cancelled ${point}`);
    assert.equal(retry.status, 200, point);
    assert.equal(retry.body.replayed, true, point);
    assertConsistentPost(retry.body.post);
  }
});

test('a 409 readback is one snapshot too', async () => {
  for (const [point, pattern] of readbackPoints) {
    const { post, job } = await scheduledPost();
    assert.equal((await cancel(job.id, { postId: post.id })).status, 200);
    const other = await scheduledPost();
    const probe = afterRead(pattern, () => scheduleDirectly(post.id, `job-new-${point.length}`));
    const refused = await cancel(other.job.id, { postId: post.id });
    assert.equal(probe.fired, true, point);
    assert.equal(refused.status, 409, point);
    assert.equal(refused.body.code, 'JOB_NOT_CANCELLABLE');
    assertConsistentPost(refused.body.post);
    assert.equal(row('publish_jobs', other.job.id).status, 'blocked_auth', 'the other post job is untouched');
  }
});
