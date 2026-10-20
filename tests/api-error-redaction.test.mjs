import assert from 'node:assert/strict';
import test, { after, afterEach, beforeEach } from 'node:test';
import { mediaRuntime } from './helpers/media-runtime.mjs';

// Synthetic D1 failures only: no external services, OAuth or real posting.
const runtime = mediaRuntime();
after(() => runtime.close());
const campaigns = runtime.route('app/api/campaigns/route.ts');
const posts = runtime.route('app/api/posts/[id]/route.ts');
const jobs = runtime.route('app/api/publish-jobs/route.ts');
const cancelRoute = runtime.route('app/api/publish-jobs/[id]/cancel/route.ts');
const connections = runtime.route('app/api/connections/route.ts');
const entitlements = runtime.route('app/api/entitlements/route.ts');
const solutions = runtime.route('app/api/solutions/route.ts');

const request = body => new Request('https://example.test/api', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
async function call(handler, body, context) { const response = await handler(request(body), context); return { status: response.status, body: await response.json() }; }
const context = id => ({ params: Promise.resolve({ id }) });
const whenIso = '2026-10-21T00:00:00.000Z';

// Everything a raw database error could carry that must never reach a client.
const secret = 'synthetic-sensitive-token-7f3a';
const marker = 'leak-marker-7f3a';
const syntheticD1Error = (detail = 'synthetic failure') =>
  new Error(`D1_ERROR: ${detail} on publish_jobs.post_id = '${marker}' token=${secret}: SQLITE_ERROR`);
const responseForbidden = [secret, marker, 'synthetic failure', 'Failed query', 'params', 'D1_ERROR', 'SQLITE', 'select "', 'insert into', 'update "', 'from "',
  'publish_jobs', 'campaign_posts', 'connector_events', 'workspace_entitlements', 'solution_configs', 'post_id', 'event_type', 'nirva-workspace'];
const logForbidden = [secret, marker, 'Failed query', 'params:'];
// A driver message carrying ordinary customer values that no redaction regex
// recognises; none of it may be logged, not even as redacted free text.
const customerValues = ['customer_email', 'alice@example.com', 'phone', '0812345678', 'tenant', 'ACME123', 'SQLITE_ACME_TENANT', 'constraint failed', 'D1_ERROR'];
const customerDriverError = () =>
  new Error('D1_ERROR: constraint failed for customer_email=alice@example.com phone=0812345678 tenant=ACME123 (extended: SQLITE_CONSTRAINT_NOTNULL) SQLITE_ACME_TENANT: SQLITE_CONSTRAINT');
// The only fields a 500 diagnostic may contain.
const allowedLogKeys = ['code', 'errorId', 'event', 'route', 'sqliteCodes'];

let logs;
const originalConsole = { error: console.error, warn: console.warn, log: console.log, info: console.info };
beforeEach(() => {
  for (const table of ['connector_events', 'publish_jobs', 'campaign_posts', 'campaigns', 'connector_accounts', 'workspace_entitlements']) runtime.sqlite.exec(`DELETE FROM ${table}`);
  runtime.sqlite.exec('DELETE FROM solution_configs');
  logs = [];
  for (const level of Object.keys(originalConsole)) {
    console[level] = (...args) => logs.push({ level, text: args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ') });
  }
});
afterEach(() => {
  Object.assign(console, originalConsole);
  delete runtime.sqlite.prepare;
  delete runtime.sqlite.exec;
});

// Fails the next matching statement when it executes, the way D1 reports
// errors; drizzle then wraps reads and writes in DrizzleQueryError, whose
// message embeds the SQL text and bound parameters.
function failExecution(pattern, error = syntheticD1Error()) {
  const prepare = runtime.sqlite.prepare;
  runtime.sqlite.prepare = function (sql) {
    if (!pattern.test(sql)) return prepare.call(this, sql);
    delete runtime.sqlite.prepare;
    const fail = () => { throw error; };
    return { setReturnArrays() {}, all: fail, run: fail, get: fail };
  };
}
// Fails the next D1 batch before any statement runs, so state is unchanged.
// D1 batch errors reach the route unwrapped.
function failBatch(error = syntheticD1Error()) {
  const exec = runtime.sqlite.exec;
  runtime.sqlite.exec = function (sql) {
    if (sql === 'BEGIN') { delete runtime.sqlite.exec; throw error; }
    return exec.call(this, sql);
  };
}

function assertSafe500(result, { route, ids = [], code = 'INTERNAL_ERROR', sqliteCodes = ['SQLITE_ERROR'], extraForbidden = [] }) {
  assert.equal(result.status, 500);
  assert.deepEqual(Object.keys(result.body).sort(), ['code', 'error', 'errorId']);
  assert.equal(result.body.code, code);
  assert.match(result.body.errorId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  const body = JSON.stringify(result.body);
  for (const fragment of [...responseForbidden, ...ids, ...extraForbidden]) assert.equal(body.includes(fragment), false, `response leaks ${fragment}`);
  const errorLogs = logs.filter(entry => entry.level === 'error');
  assert.equal(errorLogs.length, 1, 'exactly one server-side diagnostic per 500');
  assert.equal(logs.length, 1, 'no other console output');
  for (const fragment of [...logForbidden, ...ids, ...extraForbidden]) assert.equal(errorLogs[0].text.includes(fragment), false, `log leaks ${fragment}`);
  const entry = JSON.parse(errorLogs[0].text);
  assert.deepEqual(Object.keys(entry).sort(), allowedLogKeys, 'the diagnostic holds allowlisted metadata only');
  assert.equal(entry.event, 'api.internal_error');
  assert.equal(entry.errorId, result.body.errorId, 'the client reference matches the server log');
  assert.equal(entry.route, route);
  assert.equal(entry.code, code);
  assert.deepEqual(entry.sqliteCodes, sqliteCodes, 'only whitelisted SQLite result codes');
  logs.length = 0;
  return entry;
}

async function approvedPost() {
  const created = await call(campaigns.POST, { brief: 'Synthetic', language: 'en', channels: ['Facebook'] });
  const post = created.body.campaign.posts[0];
  for (const status of ['review', 'approved']) assert.equal((await call(posts.PATCH, { status }, context(post.id))).status, 200);
  return post;
}
async function scheduledPost() {
  const post = await approvedPost();
  const scheduled = await call(jobs.POST, { postId: post.id, channel: 'Facebook', scheduledAt: whenIso });
  assert.equal(scheduled.status, 201);
  return { post, job: scheduled.body.job };
}
const state = (post, job) => ({
  post: runtime.sqlite.prepare('SELECT status FROM campaign_posts WHERE id = ?').get(post.id).status,
  jobLinked: job ? runtime.sqlite.prepare('SELECT post_id FROM publish_jobs WHERE id = ?').get(job.id).post_id === post.id : null,
  jobs: runtime.sqlite.prepare('SELECT COUNT(*) AS c FROM publish_jobs').get().c,
  events: runtime.sqlite.prepare('SELECT COUNT(*) AS c FROM connector_events').get().c,
});

test('cancel: a failed read returns a generic 500 and an allowlisted server diagnostic', async () => {
  const { post, job } = await scheduledPost();
  failExecution(/from "workspace_entitlements"/);
  const result = await call(cancelRoute.POST, { postId: post.id }, context(job.id));
  assertSafe500(result, { route: 'POST /api/publish-jobs/:id/cancel', ids: [post.id, job.id] });
});

test('cancel: a failed batch with unchanged state returns a generic 500 and writes nothing', async () => {
  const { post, job } = await scheduledPost();
  const before = state(post, job);
  failBatch();
  const result = await call(cancelRoute.POST, { postId: post.id }, context(job.id));
  assertSafe500(result, { route: 'POST /api/publish-jobs/:id/cancel', ids: [post.id, job.id] });
  assert.deepEqual(state(post, job), before);
});

test('a driver message with customer values logs no free text, only whitelisted SQLite codes', async () => {
  const expected = { sqliteCodes: ['SQLITE_CONSTRAINT', 'SQLITE_CONSTRAINT_NOTNULL'], extraForbidden: customerValues };
  const { post, job } = await scheduledPost();
  failExecution(/from "workspace_entitlements"/, customerDriverError());
  assertSafe500(await call(cancelRoute.POST, { postId: post.id }, context(job.id)), { route: 'POST /api/publish-jobs/:id/cancel', ids: [post.id, job.id], ...expected });
  const approved = await approvedPost();
  failBatch(customerDriverError());
  assertSafe500(await call(jobs.POST, { postId: approved.id, channel: 'Facebook', scheduledAt: whenIso }), { route: 'POST /api/publish-jobs', ids: [approved.id], ...expected });
  failExecution(/from "campaigns"/, customerDriverError());
  const listed = await campaigns.GET();
  assertSafe500({ status: listed.status, body: await listed.json() }, { route: 'GET /api/campaigns', ...expected });
  failExecution(/^update "campaign_posts"/, customerDriverError());
  const created = await call(campaigns.POST, { brief: 'Synthetic', language: 'en', channels: ['Facebook'] });
  assertSafe500(await call(posts.PATCH, { status: 'review' }, context(created.body.campaign.posts[0].id)), { route: 'PATCH /api/posts/:id', ...expected });
});

test('campaigns: failed history reads, including the publish-queue lookup, return generic 500s', async () => {
  const post = await approvedPost();
  // History is two statements: recent campaigns, then posts joined with their
  // linked publish-queue jobs.
  for (const pattern of [/from "campaigns"/, /from "campaign_posts" left join "publish_jobs"/]) {
    failExecution(pattern);
    const response = await campaigns.GET();
    assertSafe500({ status: response.status, body: await response.json() }, { route: 'GET /api/campaigns', ids: [post.id, post.campaignId] });
  }
  assert.equal((await campaigns.GET()).status, 200, 'history works again once storage recovers');
});

test('campaigns: a failed save returns a generic 500 and writes nothing', async () => {
  failBatch();
  const result = await call(campaigns.POST, { brief: 'Synthetic', language: 'en', channels: ['Facebook', 'LINE OA'] });
  assertSafe500(result, { route: 'POST /api/campaigns' });
  assert.equal(runtime.sqlite.prepare('SELECT COUNT(*) AS c FROM campaigns').get().c, 0);
  assert.equal(runtime.sqlite.prepare('SELECT COUNT(*) AS c FROM campaign_posts').get().c, 0);
});

test('campaigns: storage that is not migrated yet keeps its message through the query wrapper', async () => {
  await approvedPost();
  failExecution(/from "campaigns"/, new Error('D1_ERROR: no such table: campaigns: SQLITE_ERROR'));
  const response = await campaigns.GET();
  const result = { status: response.status, body: await response.json() };
  assertSafe500(result, { route: 'GET /api/campaigns', code: 'STORAGE_NOT_READY' });
  assert.equal(result.body.error, 'Campaign storage is being prepared. Please retry shortly.');
});

test('campaigns: 4xx and canonical validation answers are unchanged and not logged', async () => {
  for (const [body, expected] of [
    [{ language: 'en', channels: ['Facebook'] }, { error: 'brief is required' }],
    [{ brief: 'x', language: 'xx', channels: ['Facebook'] }, { error: 'language is not supported by the 21-language NLE registry' }],
    [{ brief: 'x', language: 'en', channels: ['Nope'] }, { error: 'at least one supported channel is required' }],
  ]) {
    const result = await call(campaigns.POST, body);
    assert.equal(result.status, 400, JSON.stringify(body));
    assert.deepEqual(result.body, expected);
  }
  const { guardLocalization } = runtime.route('lib/mahasunyata/localization-guard.ts');
  const canonical = { concept_id: 'unknown-concept', source_concept_version: '0.1.0' };
  let guardMessage;
  try { guardLocalization(canonical, 'th'); } catch (error) { guardMessage = error.message; }
  assert.ok(guardMessage, 'the guard rejects the association');
  const rejected = await call(campaigns.POST, { brief: 'x', language: 'th', channels: ['Facebook'], canonical });
  assert.equal(rejected.status, 400);
  assert.deepEqual(rejected.body, { error: guardMessage }, 'canonical validation keeps its exact message');
  assert.equal(runtime.sqlite.prepare('SELECT COUNT(*) AS c FROM campaigns').get().c, 0);
  assert.deepEqual(logs, []);
});

test('storage that is not migrated yet is reported as such even through the query wrapper', async () => {
  const { post, job } = await scheduledPost();
  for (const missing of ['no such table: workspace_entitlements', 'no such column: canonical']) {
    failExecution(/from "workspace_entitlements"/, new Error(`D1_ERROR: ${missing}: SQLITE_ERROR`));
    const result = await call(cancelRoute.POST, { postId: post.id }, context(job.id));
    assertSafe500(result, { route: 'POST /api/publish-jobs/:id/cancel', ids: [post.id, job.id], code: 'STORAGE_NOT_READY' });
    assert.equal(result.body.error, 'Publishing storage is being prepared. Please retry shortly.');
  }
});

test('publish-jobs: failed list, read and batch return generic 500s without partial writes', async () => {
  failExecution(/from "publish_jobs"/);
  const listed = await jobs.GET();
  assertSafe500({ status: listed.status, body: await listed.json() }, { route: 'GET /api/publish-jobs' });

  const post = await approvedPost();
  failExecution(/from "campaign_posts"/);
  const read = await call(jobs.POST, { postId: post.id, channel: 'Facebook', scheduledAt: whenIso });
  assertSafe500(read, { route: 'POST /api/publish-jobs', ids: [post.id] });

  failBatch();
  const batch = await call(jobs.POST, { postId: post.id, channel: 'Facebook', scheduledAt: whenIso });
  assertSafe500(batch, { route: 'POST /api/publish-jobs', ids: [post.id] });
  assert.deepEqual(state(post, null), { post: 'approved', jobLinked: null, jobs: 0, events: 0 });
});

test('post updates: failed read or write returns a generic 500', async () => {
  const created = await call(campaigns.POST, { brief: 'Synthetic', language: 'en', channels: ['Facebook'] });
  const post = created.body.campaign.posts[0];
  failExecution(/from "campaign_posts"/);
  assertSafe500(await call(posts.PATCH, { status: 'review' }, context(post.id)), { route: 'PATCH /api/posts/:id', ids: [post.id] });
  failExecution(/^update "campaign_posts"/);
  assertSafe500(await call(posts.PATCH, { status: 'review' }, context(post.id)), { route: 'PATCH /api/posts/:id', ids: [post.id] });
  assert.equal(runtime.sqlite.prepare('SELECT status FROM campaign_posts WHERE id = ?').get(post.id).status, 'draft');
});

test('4xx answers keep their exact text, codes and record payloads, without an errorId or log', async () => {
  const { post, job } = await scheduledPost();
  const other = await approvedPost();
  const cases = [
    [cancelRoute.POST, {}, context(job.id), 400, { error: 'postId of the scheduled post is required' }],
    [cancelRoute.POST, { postId: post.id }, context('missing-job'), 404, { error: 'publish job not found' }],
    [jobs.POST, { channel: 'Nope' }, undefined, 400, { error: 'a supported channel is required' }],
    [jobs.POST, { postId: 'missing', channel: 'Facebook', scheduledAt: whenIso }, undefined, 404, { error: 'post not found' }],
    [posts.PATCH, { status: 'review' }, context('missing'), 404, { error: 'post not found' }],
    [posts.PATCH, { status: 'archived' }, context(post.id), 409, { error: 'this post has an active publish job; cancel it with POST /api/publish-jobs/:id/cancel first (re-timing is not available yet)', code: 'PUBLISH_QUEUE_REQUIRED' }],
  ];
  for (const [handler, body, ctx, status, expected] of cases) {
    const result = await call(handler, body, ctx);
    assert.equal(result.status, status, JSON.stringify(body));
    assert.deepEqual(result.body, expected);
  }
  const conflictResult = await call(cancelRoute.POST, { postId: other.id }, context(job.id));
  assert.equal(conflictResult.status, 409);
  assert.equal(conflictResult.body.code, 'JOB_NOT_CANCELLABLE');
  assert.equal(conflictResult.body.job.id, job.id, 'conflicts still return the records Studio needs');
  runtime.sqlite.prepare("INSERT INTO workspace_entitlements (workspace_id, workspace_name, module_ids, connector_ids, status, activated_at, updated_at) VALUES ('nirva-workspace', 'W', '[]', '[\"meta-network\"]', 'active', 1, 1)").run();
  assert.deepEqual((await call(cancelRoute.POST, { postId: post.id }, context(job.id))).body, { error: 'Smart Publisher is not included in the active workspace solution', code: 'MODULE_NOT_ENTITLED' });
  assert.deepEqual(logs, [], '4xx answers are not logged as internal errors');
});

// Connector setup records only; no account is connected and no credential is
// accepted. Values a raw connections error could carry (table, connector id
// and account name as bound parameters).
const setupRequest = { connectorId: 'meta-network', accountName: 'Synthetic setup account' };
const connectionForbidden = ['connector_accounts', 'connector_id', 'meta-network', 'Synthetic setup account'];
const connectorStorageNotReady = 'Connector storage is being prepared. Please retry shortly.';
const connectorRows = () => ({
  accounts: runtime.sqlite.prepare('SELECT id, status, account_name, updated_at FROM connector_accounts').all().map(row => ({ ...row })),
  events: runtime.sqlite.prepare('SELECT event_type FROM connector_events ORDER BY created_at, id').all().map(row => row.event_type),
});

test('connections: a failed account listing returns a generic 500 and an allowlisted diagnostic', async () => {
  failExecution(/from "connector_accounts"/);
  const listed = await connections.GET();
  assertSafe500({ status: listed.status, body: await listed.json() }, { route: 'GET /api/connections', extraForbidden: connectionForbidden });
  failExecution(/from "connector_accounts"/, customerDriverError());
  const withCustomerValues = await connections.GET();
  assertSafe500({ status: withCustomerValues.status, body: await withCustomerValues.json() }, {
    route: 'GET /api/connections',
    sqliteCodes: ['SQLITE_CONSTRAINT', 'SQLITE_CONSTRAINT_NOTNULL'],
    extraForbidden: [...connectionForbidden, ...customerValues],
  });
});

test('connections: failed setup reads and writes return generic 500s and change nothing', async () => {
  for (const pattern of [/from "workspace_entitlements"/, /from "connector_accounts"/]) {
    failExecution(pattern);
    assertSafe500(await call(connections.POST, setupRequest), { route: 'POST /api/connections', extraForbidden: connectionForbidden });
  }
  failBatch();
  assertSafe500(await call(connections.POST, setupRequest), { route: 'POST /api/connections', extraForbidden: connectionForbidden });
  assert.deepEqual(connectorRows(), { accounts: [], events: [] }, 'a failed first setup stores nothing');

  assert.equal((await call(connections.POST, setupRequest)).status, 201);
  const before = connectorRows();
  failBatch();
  assertSafe500(await call(connections.POST, { connectorId: 'meta-network', accountName: 'Renamed setup account' }), {
    route: 'POST /api/connections',
    extraForbidden: [...connectionForbidden, 'Renamed setup account'],
  });
  assert.deepEqual(connectorRows(), before, 'a failed restart leaves the existing setup record as it was');
});

test('connections: storage that is not migrated yet keeps the connector message through the query wrapper', async () => {
  failExecution(/from "connector_accounts"/, new Error('D1_ERROR: no such table: connector_accounts: SQLITE_ERROR'));
  const listed = await connections.GET();
  const result = { status: listed.status, body: await listed.json() };
  assertSafe500(result, { route: 'GET /api/connections', code: 'STORAGE_NOT_READY', extraForbidden: connectionForbidden });
  assert.equal(result.body.error, connectorStorageNotReady);
  failExecution(/from "connector_accounts"/, new Error('D1_ERROR: no such table: connector_accounts: SQLITE_ERROR'));
  const setup = await call(connections.POST, setupRequest);
  assertSafe500(setup, { route: 'POST /api/connections', code: 'STORAGE_NOT_READY', extraForbidden: connectionForbidden });
  assert.equal(setup.body.error, connectorStorageNotReady);
});

test('connections: 400, 403 and setup_required answers are unchanged, store no credentials and are not logged', async () => {
  for (const [body, expected] of [
    [{ connectorId: 'not-a-connector' }, { error: 'a supported connectorId is required' }],
    [{ connectorId: 'meta-network', accessToken: secret }, { error: 'credentials are not accepted by this endpoint' }],
    [{ connectorId: 'meta-network', client_secret: secret }, { error: 'credentials are not accepted by this endpoint' }],
  ]) {
    const result = await call(connections.POST, body);
    assert.equal(result.status, 400, JSON.stringify(Object.keys(body)));
    assert.deepEqual(result.body, expected);
  }
  assert.deepEqual(connectorRows(), { accounts: [], events: [] }, 'rejected requests store nothing');

  runtime.sqlite.prepare("INSERT INTO workspace_entitlements (workspace_id, workspace_name, module_ids, connector_ids, status, activated_at, updated_at) VALUES ('nirva-workspace', 'W', '[]', '[\"line-ecosystem\"]', 'active', 1, 1)").run();
  const notEntitled = await call(connections.POST, setupRequest);
  assert.equal(notEntitled.status, 403);
  assert.deepEqual(notEntitled.body, { error: 'Meta Network is not included in the active workspace solution' });
  runtime.sqlite.exec('DELETE FROM workspace_entitlements');

  const created = await call(connections.POST, setupRequest);
  assert.equal(created.status, 201);
  assert.equal(created.body.account.status, 'setup_required');
  assert.equal(created.body.account.accountName, 'Synthetic setup account');
  assert.equal(created.body.account.externalAccountId, null);
  assert.deepEqual(created.body.account.scopes, []);
  const restarted = await call(connections.POST, { connectorId: 'meta-network' });
  assert.equal(restarted.status, 200);
  assert.equal(restarted.body.account.id, created.body.account.id);
  assert.equal(restarted.body.account.status, 'setup_required');
  assert.equal(restarted.body.account.accountName, 'Meta Network connection');
  // Both events can share a millisecond, so their stored order is not a contract.
  assert.deepEqual([...connectorRows().events].sort(), ['connector.setup_requested', 'connector.setup_restarted']);

  const listed = await (await connections.GET()).json();
  assert.deepEqual(Object.keys(listed), ['accounts']);
  assert.deepEqual(listed.accounts.map(account => [account.id, account.status]), [[created.body.account.id, 'setup_required']]);
  assert.equal(JSON.stringify(listed).includes(secret), false, 'no credential is ever stored');
  assert.deepEqual(logs, [], '4xx and successful answers are not logged as internal errors');
});

test('entitlements: failed reads return generic 500s with no customer or query text', async () => {
  failExecution(/from "workspace_entitlements"/, customerDriverError());
  const failed = await entitlements.GET();
  assertSafe500({ status: failed.status, body: await failed.json() }, {
    route: 'GET /api/entitlements',
    sqliteCodes: ['SQLITE_CONSTRAINT', 'SQLITE_CONSTRAINT_NOTNULL'],
    extraForbidden: customerValues,
  });

  failExecution(/from "workspace_entitlements"/, new Error('D1_ERROR: no such table: workspace_entitlements: SQLITE_ERROR'));
  const missing = await entitlements.GET();
  const result = { status: missing.status, body: await missing.json() };
  assertSafe500(result, { route: 'GET /api/entitlements', code: 'STORAGE_NOT_READY' });
  assert.equal(result.body.error, 'Entitlement storage is being prepared. Please retry shortly.');
});

test('entitlements: failed solution lookup and activation do not change stored entitlements', async () => {
  const saved = await call(solutions.POST, {
    name: 'Synthetic entitlement solution', moduleIds: ['content-studio'], connectorIds: ['meta-network'],
  });
  assert.equal(saved.status, 201);
  const solutionConfigId = saved.body.solution.id;
  const before = runtime.sqlite.prepare('SELECT COUNT(*) AS c FROM workspace_entitlements').get().c;

  failExecution(/from "solution_configs"/);
  assertSafe500(await call(entitlements.PUT, { solutionConfigId }), {
    route: 'PUT /api/entitlements', ids: [solutionConfigId],
  });
  failExecution(/^insert into "workspace_entitlements"/);
  assertSafe500(await call(entitlements.PUT, { solutionConfigId }), {
    route: 'PUT /api/entitlements', ids: [solutionConfigId],
  });
  assert.equal(runtime.sqlite.prepare('SELECT COUNT(*) AS c FROM workspace_entitlements').get().c, before);
});

test('entitlements: validation, missing solution and successful synthetic activation retain their responses', async () => {
  assert.deepEqual(await call(entitlements.PUT, {}), { status: 400, body: { error: 'solutionConfigId is required' } });
  assert.deepEqual(await call(entitlements.PUT, { solutionConfigId: 'absent' }), { status: 404, body: { error: 'solution not found' } });
  const fallback = await entitlements.GET();
  assert.equal(fallback.status, 200);
  assert.equal((await fallback.json()).entitlement.status, 'trial');

  const saved = await call(solutions.POST, { name: 'Synthetic active solution', moduleIds: ['content-studio'], connectorIds: [] });
  assert.equal(saved.status, 201);
  const activated = await call(entitlements.PUT, { solutionConfigId: saved.body.solution.id });
  assert.equal(activated.status, 200);
  assert.equal(activated.body.entitlement.status, 'active');
  assert.equal(activated.body.entitlement.solutionConfigId, saved.body.solution.id);
  const listed = await entitlements.GET();
  assert.equal((await listed.json()).entitlement.solutionConfigId, saved.body.solution.id);
  assert.deepEqual(logs, [], 'validation and successful activation produce no internal-error log');
});

test('solutions: failed listing hides driver details from the client and server log', async () => {
  failExecution(/from "solution_configs"/, customerDriverError());
  const failed = await solutions.GET();
  assertSafe500({ status: failed.status, body: await failed.json() }, {
    route: 'GET /api/solutions',
    sqliteCodes: ['SQLITE_CONSTRAINT', 'SQLITE_CONSTRAINT_NOTNULL'],
    extraForbidden: customerValues,
  });

  failExecution(/from "solution_configs"/, new Error('D1_ERROR: no such table: solution_configs: SQLITE_ERROR'));
  const missing = await solutions.GET();
  const result = { status: missing.status, body: await missing.json() };
  assertSafe500(result, { route: 'GET /api/solutions', code: 'STORAGE_NOT_READY' });
  assert.equal(result.body.error, 'Solution storage is being prepared. Please retry shortly.');
});

test('solutions: failed save hides its name and does not store a configuration', async () => {
  const name = 'Synthetic private solution';
  failExecution(/^insert into "solution_configs"/);
  assertSafe500(await call(solutions.POST, { name, moduleIds: ['content-studio'], connectorIds: ['meta-network'] }), {
    route: 'POST /api/solutions', extraForbidden: [name],
  });
  assert.equal(runtime.sqlite.prepare('SELECT COUNT(*) AS c FROM solution_configs').get().c, 0);
});

test('solutions: validation and a synthetic saved configuration keep their existing responses', async () => {
  assert.deepEqual(await call(solutions.POST, { moduleIds: ['content-studio'] }), { status: 400, body: { error: 'name is required' } });
  assert.deepEqual(await call(solutions.POST, { name: 'Synthetic empty solution' }), { status: 400, body: { error: 'at least one module is required' } });
  const saved = await call(solutions.POST, {
    name: 'Synthetic saved solution', moduleIds: ['content-studio'], connectorIds: ['meta-network'],
  });
  assert.equal(saved.status, 201);
  assert.equal(saved.body.solution.name, 'Synthetic saved solution');
  assert.deepEqual(saved.body.solution.moduleIds, ['content-studio']);
  const listed = await solutions.GET();
  assert.equal(listed.status, 200);
  assert.deepEqual((await listed.json()).solutions.map(solution => solution.id), [saved.body.solution.id]);
  assert.deepEqual(logs, [], 'validation and successful saves produce no internal-error log');
});
