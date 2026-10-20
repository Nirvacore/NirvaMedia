import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { isDeepStrictEqual } from 'node:util';
import test, { after, beforeEach } from 'node:test';
import { mediaRuntime } from './helpers/media-runtime.mjs';

const runtime = mediaRuntime();
after(() => runtime.close());
const campaigns = runtime.route('app/api/campaigns/route.ts');
const posts = runtime.route('app/api/posts/[id]/route.ts');
const jobs = runtime.route('app/api/publish-jobs/route.ts');

const when = '2026-10-20T09:30:00+07:00';
const whenIso = '2026-10-20T02:30:00.000Z';
const request = body => new Request('https://example.test/api', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
async function call(handler, body, context) { const response = await handler(request(body), context); return { status: response.status, body: await response.json() }; }
const context = id => ({ params: Promise.resolve({ id }) });
const count = table => runtime.sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
const stored = id => ({ ...runtime.sqlite.prepare('SELECT status, scheduled_at FROM campaign_posts WHERE id = ?').get(id) });
const schedule = (post, extra = {}) => call(jobs.POST, { postId: post.id, channel: post.channel, scheduledAt: when, ...extra });
const insertJob = (id, postId, scheduledAt = Date.parse(whenIso)) => runtime.sqlite
  .prepare("INSERT INTO publish_jobs (id, workspace_id, post_id, channel, status, scheduled_at, attempts, created_at, updated_at) VALUES (?, 'nirva-workspace', ?, 'Facebook', 'blocked_auth', ?, 0, 1, 1)")
  .run(id, postId, scheduledAt);
const entitle = (moduleIds, connectorIds) => runtime.sqlite
  .prepare("INSERT OR REPLACE INTO workspace_entitlements (workspace_id, workspace_name, module_ids, connector_ids, status, activated_at, updated_at) VALUES ('nirva-workspace', 'Nirva Workspace', ?, ?, 'active', 1, 1)")
  .run(JSON.stringify(moduleIds), JSON.stringify(connectorIds));
const scheduleDirectly = (postId, scheduledAt = whenIso) => runtime.sqlite
  .prepare("UPDATE campaign_posts SET status = 'scheduled', scheduled_at = ? WHERE id = ?")
  .run(scheduledAt, postId);

beforeEach(() => {
  for (const table of ['connector_events', 'publish_jobs', 'campaign_posts', 'campaigns', 'connector_accounts', 'workspace_entitlements']) runtime.sqlite.exec(`DELETE FROM ${table}`);
});

async function savedPost(status = 'approved') {
  const created = await call(campaigns.POST, { brief: 'Launch', language: 'en', channels: ['Facebook'] });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const post = created.body.campaign.posts[0];
  for (const next of { draft: [], review: ['review'], approved: ['review', 'approved'] }[status]) {
    assert.equal((await call(posts.PATCH, { status: next }, context(post.id))).status, 200);
  }
  return post;
}

// Runs `change` just before the route prepares its first matching write, as a
// concurrent request committing between the route's reads and its batch would.
function beforeWrite(pattern, change) {
  const prepare = runtime.sqlite.prepare;
  runtime.sqlite.prepare = function (sql) {
    if (pattern.test(sql)) { delete runtime.sqlite.prepare; change(); }
    return prepare.call(this, sql);
  };
}

test('scheduling an approved post saves post, job and audit event together', async () => {
  const post = await savedPost();
  const result = await schedule(post);
  assert.equal(result.status, 201, JSON.stringify(result.body));
  assert.equal(result.body.post.status, 'scheduled');
  assert.equal(result.body.post.scheduledAt, whenIso);
  assert.deepEqual(stored(post.id), { status: 'scheduled', scheduled_at: whenIso });
  const job = runtime.sqlite.prepare('SELECT * FROM publish_jobs').get();
  assert.equal(job.id, result.body.job.id);
  assert.equal(job.post_id, post.id);
  assert.equal(job.channel, 'Facebook');
  assert.equal(job.scheduled_at, Date.parse(whenIso));
  assert.equal(job.status, 'blocked_auth');
  const event = runtime.sqlite.prepare('SELECT * FROM connector_events').get();
  assert.equal(count('connector_events'), 1);
  assert.equal(event.event_type, 'publish_job.blocked_auth');
  assert.deepEqual(JSON.parse(event.payload), {
    publishJobId: job.id, postId: post.id, channel: 'Facebook', connectorId: 'meta-network',
    scheduledAt: whenIso, postStatusFrom: 'approved', postStatusTo: 'scheduled',
  });
});

test('scheduling fails closed without the Smart Publisher module even when the connector is entitled', async () => {
  const post = await savedPost();
  entitle([], ['meta-network']);
  const blocked = await schedule(post);
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.code, 'MODULE_NOT_ENTITLED');
  assert.deepEqual(stored(post.id), { status: 'approved', scheduled_at: null });
  assert.equal(count('publish_jobs') + count('connector_events'), 0);
  entitle(['smart-publisher'], ['meta-network']);
  assert.equal((await schedule(post)).status, 201);
});

test('a connected account queues the job; connector entitlement still fails closed without writes', async () => {
  const post = await savedPost();
  entitle(['smart-publisher'], ['line-ecosystem']);
  assert.equal((await schedule(post)).status, 403);
  assert.equal(stored(post.id).status, 'approved');
  assert.equal(count('publish_jobs') + count('connector_events'), 0);
  runtime.sqlite.exec('DELETE FROM workspace_entitlements');
  runtime.sqlite.prepare("INSERT INTO connector_accounts (id, workspace_id, connector_id, account_name, status, scopes, created_at, updated_at) VALUES ('meta', 'nirva-workspace', 'meta-network', 'Fixture', 'connected', '[]', 1, 1)").run();
  const result = await schedule(post);
  assert.equal(result.status, 201);
  assert.equal(result.body.job.status, 'queued');
  assert.equal(result.body.job.connectorAccountId, 'meta');
  assert.equal(runtime.sqlite.prepare('SELECT event_type FROM connector_events').get().event_type, 'publish_job.queued');
});

test('jobs require a saved approved post with matching channel and a schedule', async () => {
  const draft = await savedPost('draft');
  const review = await savedPost('review');
  const approved = await savedPost();
  for (const [body, status, code] of [
    [{ channel: 'Facebook', scheduledAt: when }, 400],
    [{ postId: 'missing', channel: 'Facebook', scheduledAt: when }, 404],
    [{ postId: draft.id, channel: 'Facebook', scheduledAt: when }, 409, 'POST_NOT_APPROVED'],
    [{ postId: review.id, channel: 'Facebook', scheduledAt: when }, 409, 'POST_NOT_APPROVED'],
    [{ postId: approved.id, channel: 'Instagram', scheduledAt: when }, 400],
    [{ postId: approved.id, channel: 'Facebook' }, 400],
    [{ postId: approved.id, channel: 'Facebook', scheduledAt: 'not a date' }, 400],
  ]) {
    const result = await call(jobs.POST, body);
    assert.equal(result.status, status, JSON.stringify(body));
    assert.equal(typeof result.body.error, 'string', 'Studio treats these as definitive no-write answers');
    if (code) assert.equal(result.body.code, code);
    if (code === 'POST_NOT_APPROVED') assert.equal('job' in result.body, false, 'the queue was not read, so job is omitted');
  }
  assert.equal(count('publish_jobs') + count('connector_events'), 0);
  assert.deepEqual([draft, review, approved].map(post => stored(post.id).status), ['draft', 'review', 'approved']);
});

test('retrying the same schedule replays the existing job instead of writing again', async () => {
  const post = await savedPost();
  const first = await schedule(post);
  const retry = await schedule(post, { scheduledAt: whenIso });
  assert.equal(retry.status, 200);
  assert.equal(retry.body.replayed, true);
  assert.equal(retry.body.job.id, first.body.job.id);
  const moved = await schedule(post, { scheduledAt: '2026-10-21T02:30:00.000Z' });
  assert.equal(moved.status, 409);
  assert.equal(moved.body.code, 'PUBLISH_JOB_EXISTS');
  assert.equal(moved.body.job.id, first.body.job.id);
  assert.deepEqual(stored(post.id), { status: 'scheduled', scheduled_at: whenIso });
  assert.equal(count('publish_jobs'), 1);
  assert.equal(count('connector_events'), 1);
});

test('concurrent first submissions create exactly one job and one audit event', async () => {
  const post = await savedPost();
  const results = await Promise.all([schedule(post), schedule(post)]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 201]);
  assert.equal(results[0].body.job.id, results[1].body.job.id);
  assert.equal(count('publish_jobs'), 1);
  assert.equal(count('connector_events'), 1);
});

test('the database rejects a second job for the same post', async () => {
  const post = await savedPost();
  await schedule(post);
  assert.throws(() => insertJob('duplicate', post.id), /UNIQUE constraint failed: publish_jobs\.post_id/);
  assert.equal(count('publish_jobs'), 1);
});

test('a stale request cannot attach a job to a post that changed before its batch', async () => {
  const post = await savedPost();
  beforeWrite(/^update "campaign_posts"/, () => runtime.sqlite.prepare("UPDATE campaign_posts SET status = 'archived' WHERE id = ?").run(post.id));
  const result = await schedule(post);
  assert.equal(result.status, 409);
  assert.equal(result.body.code, 'POST_STATE_CHANGED');
  assert.equal(stored(post.id).status, 'archived');
  assert.equal(count('publish_jobs') + count('connector_events'), 0);
});

test('a request that loses the race replays an identical winner and rejects a different one', async () => {
  for (const [winnerTime, status, code] of [[whenIso, 200], ['2026-10-22T00:00:00.000Z', 409, 'PUBLISH_JOB_EXISTS']]) {
    runtime.sqlite.exec('DELETE FROM publish_jobs');
    const post = await savedPost();
    beforeWrite(/^update "campaign_posts"/, () => {
      scheduleDirectly(post.id, winnerTime);
      insertJob(`winner-${status}`, post.id, Date.parse(winnerTime));
    });
    const result = await schedule(post);
    assert.equal(result.status, status);
    if (code) assert.equal(result.body.code, code);
    assert.equal(result.body.job.id, `winner-${status}`);
    assert.deepEqual(stored(post.id), { status: 'scheduled', scheduled_at: winnerTime });
    assert.equal(count('publish_jobs'), 1);
    assert.equal(count('connector_events'), 0, 'the losing request writes no audit event');
  }
});

test('post updates cannot schedule, publish or change a queued post outside the queue', async () => {
  const post = await savedPost();
  for (const body of [{ scheduledAt: when }, { status: 'scheduled' }, { status: 'published' }]) {
    const result = await call(posts.PATCH, body, context(post.id));
    assert.equal(result.status, 409, JSON.stringify(body));
    assert.equal(result.body.code, 'PUBLISH_QUEUE_REQUIRED');
  }
  assert.equal(stored(post.id).status, 'approved');
  await schedule(post);
  for (const status of ['approved', 'archived']) {
    const result = await call(posts.PATCH, { status }, context(post.id));
    assert.equal(result.status, 409, status);
    assert.equal(result.body.code, 'PUBLISH_QUEUE_REQUIRED');
  }
  assert.deepEqual(stored(post.id), { status: 'scheduled', scheduled_at: whenIso });
  assert.equal(count('publish_jobs'), 1);
});

test('a post update that loses the race to scheduling cannot orphan the job', async () => {
  const post = await savedPost();
  beforeWrite(/^update "campaign_posts"/, () => {
    scheduleDirectly(post.id);
    insertJob('winner', post.id);
  });
  const result = await call(posts.PATCH, { status: 'archived' }, context(post.id));
  assert.equal(result.status, 409);
  assert.equal(result.body.code, 'POST_STATE_CHANGED');
  assert.deepEqual(stored(post.id), { status: 'scheduled', scheduled_at: whenIso });
});

test('a legacy scheduled post without a job is repaired only by retrying its stored schedule', async () => {
  const post = await savedPost();
  scheduleDirectly(post.id, '2026-10-01T00:00:00Z');
  const moved = await schedule(post, { scheduledAt: '2026-10-02T00:00:00Z' });
  assert.equal(moved.status, 409);
  assert.equal(moved.body.code, 'SCHEDULE_MISMATCH');
  assert.equal(moved.body.job, null, 'the queue was read and has no job for this post');
  const repaired = await schedule(post, { scheduledAt: '2026-10-01T00:00:00.000Z' });
  assert.equal(repaired.status, 201, JSON.stringify(repaired.body));
  assert.deepEqual(stored(post.id), { status: 'scheduled', scheduled_at: '2026-10-01T00:00:00Z' });
  assert.equal(runtime.sqlite.prepare('SELECT scheduled_at FROM publish_jobs').get().scheduled_at, Date.parse('2026-10-01T00:00:00Z'));
  assert.equal(JSON.parse(runtime.sqlite.prepare('SELECT payload FROM connector_events').get().payload).postStatusFrom, 'scheduled');
});

test('a legacy scheduled post without a time can return to approved and be rescheduled', async () => {
  const post = await savedPost();
  scheduleDirectly(post.id, null);
  assert.equal((await schedule(post)).body.code, 'SCHEDULE_MISMATCH');
  const reverted = await call(posts.PATCH, { status: 'approved' }, context(post.id));
  assert.equal(reverted.status, 200);
  assert.equal(reverted.body.post.scheduledAt, null);
  assert.equal((await schedule(post)).status, 201);
  assert.equal(count('publish_jobs'), 1);
});

test('campaign history reports each post queue job so Studio can find unqueued legacy schedules', async () => {
  const queued = await savedPost();
  const scheduled = await schedule(queued);
  const legacy = await savedPost();
  scheduleDirectly(legacy.id);
  const draft = await savedPost('draft');
  const listed = (await (await campaigns.GET()).json()).campaigns.flatMap(campaign => campaign.posts);
  const byId = new Map(listed.map(post => [post.id, post]));
  assert.deepEqual(byId.get(queued.id).publishJob, { id: scheduled.body.job.id, status: 'blocked_auth' });
  assert.equal(byId.get(legacy.id).status, 'scheduled');
  assert.equal(byId.get(legacy.id).publishJob, null);
  assert.equal(byId.get(draft.id).publishJob, null);
  const repaired = await schedule(legacy, { scheduledAt: byId.get(legacy.id).scheduledAt });
  assert.equal(repaired.status, 201, 'Studio repairs with the exact stored time it received');
});

test('migration 0006 detaches legacy duplicate jobs before adding the unique guard', () => {
  const directory = new URL('../drizzle/', import.meta.url);
  const database = new DatabaseSync(':memory:');
  try {
    for (const name of readdirSync(directory).filter(file => file.endsWith('.sql') && file < '0006').sort()) {
      database.exec(readFileSync(new URL(name, directory), 'utf8'));
    }
    const legacy = database.prepare("INSERT INTO publish_jobs (id, workspace_id, post_id, channel, status, attempts, created_at, updated_at) VALUES (?, 'nirva-workspace', ?, 'Facebook', ?, 0, ?, ?)");
    for (const [id, postId, status, createdAt] of [
      ['first', 'post-1', 'blocked_auth', 1], ['retry-b', 'post-1', 'blocked_auth', 2], ['retry-a', 'post-1', 'queued', 2],
      ['other', 'post-2', 'blocked_auth', 1], ['tie-a', 'post-3', 'blocked_auth', 5], ['tie-b', 'post-3', 'blocked_auth', 5],
      ['channel-only-1', null, 'blocked_auth', 1], ['channel-only-2', null, 'blocked_auth', 1],
    ]) legacy.run(id, postId, status, createdAt, createdAt);

    database.exec(readFileSync(new URL('0006_publish_job_post_guard.sql', directory), 'utf8'));

    const detached = postId => `Duplicate publish job for post ${postId} detached by migration 0006`;
    assert.deepEqual(database.prepare('SELECT id, post_id, status, last_error FROM publish_jobs ORDER BY id').all().map(row => ({ ...row })), [
      { id: 'channel-only-1', post_id: null, status: 'blocked_auth', last_error: null },
      { id: 'channel-only-2', post_id: null, status: 'blocked_auth', last_error: null },
      { id: 'first', post_id: 'post-1', status: 'blocked_auth', last_error: null },
      { id: 'other', post_id: 'post-2', status: 'blocked_auth', last_error: null },
      { id: 'retry-a', post_id: null, status: 'failed', last_error: detached('post-1') },
      { id: 'retry-b', post_id: null, status: 'failed', last_error: detached('post-1') },
      { id: 'tie-a', post_id: 'post-3', status: 'blocked_auth', last_error: null },
      { id: 'tie-b', post_id: null, status: 'failed', last_error: detached('post-3') },
    ]);
    assert.deepEqual(database.prepare('SELECT id, event_type, payload FROM connector_events ORDER BY id').all().map(row => ({ ...row, payload: JSON.parse(row.payload) })), [
      ['retry-a', 'post-1', 'queued'], ['retry-b', 'post-1', 'blocked_auth'], ['tie-b', 'post-3', 'blocked_auth'],
    ].map(([id, postId, previousStatus]) => ({
      id: `migration-0006-${id}`, event_type: 'publish_job.duplicate_detached',
      payload: { publishJobId: id, postId, previousStatus, migration: '0006_publish_job_post_guard' },
    })));
    assert.throws(() => legacy.run('again', 'post-1', 'blocked_auth', 9, 9), /UNIQUE constraint failed: publish_jobs\.post_id/);
  } finally {
    database.close();
  }
});

// Runs `change` right after the first statement matching `pattern` executes:
// a concurrent writer committing between two reads of the same response.
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
const resetQueue = () => {
  for (const table of ['connector_events', 'publish_jobs', 'campaign_posts', 'campaigns', 'connector_accounts', 'workspace_entitlements']) runtime.sqlite.exec(`DELETE FROM ${table}`);
};
const cancelDirectly = (postId, jobId) => {
  runtime.sqlite.prepare("UPDATE campaign_posts SET status = 'approved', scheduled_at = NULL WHERE id = ?").run(postId);
  runtime.sqlite.prepare("UPDATE publish_jobs SET status = 'cancelled', post_id = NULL WHERE id = ?").run(jobId);
};
// The real stored state of a post and the job linked to it right now.
function storedPair(postId) {
  const post = runtime.sqlite.prepare('SELECT status, scheduled_at FROM campaign_posts WHERE id = ?').get(postId);
  const job = runtime.sqlite.prepare('SELECT id, status, post_id FROM publish_jobs WHERE post_id = ?').get(postId);
  return { post: { status: post.status, scheduledAt: post.scheduled_at }, job: job ? { id: job.id, status: job.status, postId: job.post_id } : null };
}
// A response must show one real moment: exactly the state before the write or
// exactly the state after it. No "scheduled implies a job" rule is assumed,
// because legacy scheduled posts without a job remain a supported state.
function assertBeforeOrAfter(actual, before, after, label) {
  assert.ok(
    isDeepStrictEqual(actual, before) || isDeepStrictEqual(actual, after),
    `${label}: response mixes two moments\n actual: ${JSON.stringify(actual)}\n before: ${JSON.stringify(before)}\n after:  ${JSON.stringify(after)}`,
  );
}

test('campaign history pairs each post with its linked job from one snapshot, legacy unqueued posts included', async t => {
  for (const [point, pattern] of [
    ['after the posts read', /^select .*from "campaign_posts"/],
    ['after the linked-job read', /^select .*"publish_jobs"\."post_id"/],
  ]) await t.test(point, async () => {
    resetQueue();
    const toSchedule = await savedPost();
    const toCancel = await savedPost();
    const queued = await schedule(toCancel);
    const legacy = await savedPost();
    scheduleDirectly(legacy.id, '2026-10-01T00:00:00Z');
    const ids = [toSchedule.id, toCancel.id, legacy.id];
    const view = pairs => Object.fromEntries(ids.map(id => [id, pairs(id)]));
    const historyView = post => ({ status: post.status, scheduledAt: post.scheduledAt, publishJob: post.publishJob });
    const storedView = id => { const { post, job } = storedPair(id); return { ...post, publishJob: job && { id: job.id, status: job.status } }; };
    const before = view(storedView);
    const probe = afterRead(pattern, () => {
      scheduleDirectly(toSchedule.id, '2026-10-23T00:00:00.000Z');
      insertJob('job-new', toSchedule.id, Date.parse('2026-10-23T00:00:00.000Z'));
      cancelDirectly(toCancel.id, queued.body.job.id);
    });
    const listed = (await (await campaigns.GET()).json()).campaigns.flatMap(campaign => campaign.posts);
    assert.equal(probe.fired, true, `the write landed ${point}`);
    const after = view(storedView);
    const seen = view(id => historyView(listed.find(post => post.id === id)));
    assertBeforeOrAfter(seen, before, after, point);
    assert.deepEqual(seen[legacy.id], { status: 'scheduled', scheduledAt: '2026-10-01T00:00:00Z', publishJob: null }, 'a legacy unqueued schedule is reported as it is');
  });
});

test('campaign history keeps its shape, post order and 8-campaign limit', async () => {
  const first = await call(campaigns.POST, { brief: 'Order', language: 'en', channels: ['Instagram', 'Facebook', 'LINE OA'] });
  const post = first.body.campaign.posts[1];
  for (const status of ['review', 'approved']) await call(posts.PATCH, { status }, context(post.id));
  const queued = await schedule(post);
  const listed = (await (await campaigns.GET()).json()).campaigns;
  const campaign = listed.find(item => item.id === first.body.campaign.id);
  assert.deepEqual(Object.keys(campaign), ['id', 'brief', 'language', 'tone', 'channels', 'status', 'createdAt', 'updatedAt', 'posts']);
  assert.deepEqual(campaign.posts.map(item => item.channel), ['Instagram', 'Facebook', 'LINE OA'], 'posts keep their saved order');
  assert.deepEqual(Object.keys(campaign.posts[0]), ['id', 'campaignId', 'channel', 'format', 'title', 'body', 'scheduledAt', 'canonical', 'status', 'createdAt', 'publishJob']);
  assert.deepEqual(campaign.posts.map(item => item.publishJob), [null, { id: queued.body.job.id, status: 'blocked_auth' }, null]);
  for (let index = 0; index < 9; index += 1) await call(campaigns.POST, { brief: `More ${index}`, language: 'en', channels: ['Facebook'] });
  assert.equal((await (await campaigns.GET()).json()).campaigns.length, 8);
});

test('a losing schedule reports the winning post and its job from one snapshot', async t => {
  const scenarios = [
    // An approved post loses to a schedule at another time; the winner's job is then cancelled.
    { name: 'schedule', legacyAt: null, winnerAt: '2026-10-24T00:00:00.000Z', firstWrite: /^update "campaign_posts"/ },
    // A legacy scheduled post without a job loses its repair to an identical repair; that job is then cancelled.
    { name: 'legacy repair', legacyAt: '2026-10-01T00:00:00.000Z', winnerAt: '2026-10-01T00:00:00.000Z', firstWrite: /^insert into "publish_jobs"/ },
  ];
  for (const { name, legacyAt, winnerAt, firstWrite } of scenarios) {
    for (const [point, pattern] of [
      ['after the post read', /^select .*from "campaign_posts"/],
      ['after the job read', /^select .*"publish_jobs"\."post_id" = /],
    ]) await t.test(`${name}, ${point}`, async () => {
      const label = `${name}, ${point}`;
      resetQueue();
      const post = await savedPost();
      if (legacyAt) scheduleDirectly(post.id, legacyAt);
      let before;
      let probe;
      beforeWrite(firstWrite, () => {
        if (!legacyAt) scheduleDirectly(post.id, winnerAt);
        insertJob('winner', post.id, Date.parse(winnerAt));
        before = storedPair(post.id);
        probe = afterRead(pattern, () => cancelDirectly(post.id, 'winner'));
      });
      const result = await schedule(post, { scheduledAt: legacyAt ?? when });
      assert.equal(probe?.fired, true, `${label}: the cancel landed during the readback`);
      const after = storedPair(post.id);
      const seen = {
        post: result.body.post ? { status: result.body.post.status, scheduledAt: result.body.post.scheduledAt } : result.body.post,
        job: result.body.job ? { id: result.body.job.id, status: result.body.job.status, postId: result.body.job.postId } : result.body.job,
      };
      assertBeforeOrAfter(seen, before, after, `${label} (HTTP ${result.status} ${result.body.code ?? ''})`);
      assert.equal(count('publish_jobs'), 1, `${label}: the losing request wrote no job`);
      assert.equal(count('connector_events'), 0, `${label}: the losing request wrote no audit event`);
    });
  }
});

// SQLite promises no row order without ORDER BY. This pragma reverses
// unordered scans on the shared test connection, so a response that relies on
// incidental row order comes back reordered.
async function withReversedUnorderedSelects(run) {
  runtime.sqlite.exec('PRAGMA reverse_unordered_selects = ON');
  try {
    assert.equal(runtime.sqlite.prepare('PRAGMA reverse_unordered_selects').get().reverse_unordered_selects, 1, 'the pragma is supported');
    await run();
  } finally {
    runtime.sqlite.exec('PRAGMA reverse_unordered_selects = OFF');
  }
}
const historyOrder = async (campaignId, label = post => post.channel) =>
  (await (await campaigns.GET()).json()).campaigns.find(campaign => campaign.id === campaignId).posts.map(label);

test('campaign history follows the saved channel order even when SQLite returns rows in reverse', async () => {
  const channels = ['Instagram', 'Facebook', 'LINE OA'];
  const created = await call(campaigns.POST, { brief: 'Order', language: 'en', channels });
  const campaignId = created.body.campaign.id;
  const rawOrder = () => runtime.sqlite.prepare('SELECT channel FROM campaign_posts WHERE campaign_id = ?').all(campaignId).map(row => row.channel);
  assert.deepEqual(await historyOrder(campaignId), channels);
  await withReversedUnorderedSelects(async () => {
    assert.deepEqual(rawOrder(), ['LINE OA', 'Facebook', 'Instagram'], 'the fixture really reverses unordered rows');
    assert.deepEqual(await historyOrder(campaignId), channels, 'history follows campaign.channels, not SQL row order');
  });
});

test('legacy extra posts follow the saved channels in a stable order under either row order', async () => {
  const created = await call(campaigns.POST, { brief: 'Legacy', language: 'en', channels: ['Instagram', 'Facebook', 'LINE OA'] });
  const campaignId = created.body.campaign.id;
  const base = runtime.sqlite.prepare('SELECT created_at FROM campaign_posts WHERE campaign_id = ? LIMIT 1').get(campaignId).created_at;
  const legacy = runtime.sqlite.prepare("INSERT INTO campaign_posts (id, campaign_id, channel, format, title, body, status, created_at) VALUES (?, ?, ?, 'f', 't', 'b', 'draft', ?)");
  // Inserted out of their expected order, so insertion order cannot pass.
  legacy.run('legacy-x', campaignId, 'X', base + 5); // channel no longer listed
  legacy.run('legacy-tie-b', campaignId, 'Pinterest', base + 20); // same time as tie-a: id decides
  legacy.run('legacy-telegram', campaignId, 'Telegram', base - 1000); // older unlisted post
  legacy.run('legacy-tie-a', campaignId, 'Snapchat', base + 20);
  legacy.run('legacy-facebook', campaignId, 'Facebook', base + 10); // second post for a listed channel
  const expected = [
    'Instagram', 'Facebook', 'Facebook:legacy-facebook', 'LINE OA',
    'Telegram:legacy-telegram', 'X:legacy-x', 'Snapchat:legacy-tie-a', 'Pinterest:legacy-tie-b',
  ];
  const label = post => post.id.startsWith('legacy-') ? `${post.channel}:${post.id}` : post.channel;
  assert.deepEqual(await historyOrder(campaignId, label), expected);
  await withReversedUnorderedSelects(async () => assert.deepEqual(await historyOrder(campaignId, label), expected));
});

// Records the SQL of statements matching `pattern` without changing them.
function captureSql(pattern) {
  const prepare = runtime.sqlite.prepare;
  const seen = [];
  runtime.sqlite.prepare = function (sql) {
    if (pattern.test(sql)) seen.push(sql);
    return prepare.call(this, sql);
  };
  return { seen, stop: () => { delete runtime.sqlite.prepare; } };
}

test('the 8 newest campaigns are chosen deterministically when creation times tie at the boundary', async () => {
  const insert = runtime.sqlite.prepare("INSERT INTO campaigns (id, brief, language, tone, channels, status, created_at, updated_at) VALUES (?, ?, 'en', 't', '[\"Facebook\"]', 'draft', ?, ?)");
  insert.run('c-newest', 'newest', 6000, 6000);
  // Ten campaigns share one creation time, inserted in an order unrelated to id,
  // so whichever 7 of them fill the remaining slots depends on the tie-break.
  for (const id of ['c-07', 'c-02', 'c-09', 'c-04', 'c-01', 'c-10', 'c-06', 'c-03', 'c-08', 'c-05']) insert.run(id, id, 5000, 5000);

  async function selectionUnderCurrentPlan() {
    const capture = captureSql(/^select .*from "campaigns" order by/);
    try {
      const ids = (await (await campaigns.GET()).json()).campaigns.map(campaign => campaign.id);
      assert.equal(capture.seen.length, 1, 'one campaign selection statement');
      const plan = runtime.sqlite.prepare(`EXPLAIN QUERY PLAN ${capture.seen[0]}`).all().map(row => row.detail).join(' | ');
      return { ids, plan };
    } finally {
      capture.stop();
    }
  }

  const indexed = await selectionUnderCurrentPlan();
  let tableScan;
  // Another valid plan for the same query: without the created_at index SQLite
  // scans the table and sorts, which breaks ties differently.
  runtime.sqlite.exec('DROP INDEX `idx_campaigns_created_at`');
  try {
    tableScan = await selectionUnderCurrentPlan();
  } finally {
    runtime.sqlite.exec('CREATE INDEX `idx_campaigns_created_at` ON `campaigns` (`created_at`)');
  }
  assert.match(indexed.plan, /USING INDEX idx_campaigns_created_at/, 'first plan scans the created_at index');
  assert.doesNotMatch(tableScan.plan, /idx_campaigns_created_at/, 'second plan does not use that index');
  assert.match(tableScan.plan, /TEMP B-TREE FOR ORDER BY/, 'second plan sorts a table scan');

  const expected = ['c-newest', 'c-01', 'c-02', 'c-03', 'c-04', 'c-05', 'c-06', 'c-07'];
  assert.deepEqual(
    { indexed: indexed.ids, tableScan: tableScan.ids },
    { indexed: expected, tableScan: expected },
    'newest first, then id, whichever plan SQLite picks',
  );
});

test('the 50 newest queue jobs are chosen deterministically when creation times tie at the boundary', async () => {
  const insert = runtime.sqlite.prepare("INSERT INTO publish_jobs (id, workspace_id, post_id, channel, status, attempts, created_at, updated_at) VALUES (?, ?, ?, 'Facebook', ?, 0, ?, ?)");
  insert.run('j-newest', 'nirva-workspace', 'post-newest', 'queued', 9000, 9000);
  // Another workspace's newer job must never be listed.
  insert.run('o-other', 'other-workspace', 'post-other', 'queued', 9999, 9999);
  // 55 jobs share one creation time, inserted in an order unrelated to id and
  // with mixed statuses, so the (workspace_id, status) index orders them
  // differently from a table scan and the 49 remaining slots depend on the
  // tie-break.
  const statuses = ['queued', 'blocked_auth', 'cancelled', 'failed'];
  const tied = Array.from({ length: 55 }, (_, index) => index + 1).sort((a, b) => ((a * 37) % 55) - ((b * 37) % 55));
  tied.forEach((number, index) => {
    const id = `j-${String(number).padStart(2, '0')}`;
    insert.run(id, 'nirva-workspace', `post-${id}`, statuses[index % statuses.length], 5000, 5000);
  });

  async function listingUnderCurrentPlan() {
    const capture = captureSql(/^select .*from "publish_jobs" where "publish_jobs"\."workspace_id"/);
    try {
      const response = await jobs.GET();
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.deepEqual(Object.keys(body), ['jobs']);
      assert.equal(capture.seen.length, 1, 'one queue listing statement');
      const plan = runtime.sqlite.prepare(`EXPLAIN QUERY PLAN ${capture.seen[0]}`).all().map(row => row.detail).join(' | ');
      return { jobs: body.jobs, plan };
    } finally {
      capture.stop();
    }
  }

  const indexed = await listingUnderCurrentPlan();
  let tableScan;
  // Another valid plan for the same query: without the workspace/status index
  // SQLite scans the table and sorts, which breaks ties differently.
  runtime.sqlite.exec('DROP INDEX `idx_publish_jobs_workspace_status`');
  try {
    tableScan = await listingUnderCurrentPlan();
  } finally {
    runtime.sqlite.exec('CREATE INDEX `idx_publish_jobs_workspace_status` ON `publish_jobs` (`workspace_id`,`status`)');
  }
  assert.match(indexed.plan, /USING INDEX idx_publish_jobs_workspace_status/, 'first plan searches the workspace/status index');
  assert.doesNotMatch(tableScan.plan, /idx_publish_jobs_workspace_status/, 'second plan does not use that index');
  assert.match(tableScan.plan, /SCAN publish_jobs/, 'second plan scans the table');

  const expected = ['j-newest', ...Array.from({ length: 49 }, (_, index) => `j-${String(index + 1).padStart(2, '0')}`)];
  assert.deepEqual(
    { indexed: indexed.jobs.map(job => job.id), tableScan: tableScan.jobs.map(job => job.id) },
    { indexed: expected, tableScan: expected },
    'newest first, then id, whichever plan SQLite picks; 50 jobs from this workspace only',
  );
  assert.deepEqual(Object.keys(indexed.jobs[0]), ['id', 'workspaceId', 'postId', 'connectorAccountId', 'channel', 'status', 'scheduledAt', 'attempts', 'lastError', 'createdAt', 'updatedAt'], 'job shape is unchanged');
});
