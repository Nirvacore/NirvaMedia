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
const translations = runtime.route('app/api/translations/route.ts');
const remember = runtime.route('app/api/translations/remember/route.ts');

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
  runtime.sqlite.exec('DELETE FROM translation_memories');
  runtime.provider.result = { status: 'unavailable', providerId: 'test', reason: 'missing_credential' };
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

// Translation Memory: synthetic text only. The provider adapter is the test
// harness stub, so nothing is sent to an external service.
const memoryInput = { sourceText: 'Synthetic private launch note 4417', sourceLanguage: 'en', targetLanguage: 'th' };
const rememberInput = { ...memoryInput, translatedText: 'บันทึกเปิดตัวสังเคราะห์ 4417' };
const memoryForbidden = ['translation_memories', 'source_hash', 'source_text', 'translated_text', 'Synthetic private launch note', 'บันทึกเปิดตัวสังเคราะห์'];
const memoryStorageNotReady = 'Translation Memory storage is being prepared. Please retry shortly.';
const memoryCount = () => runtime.sqlite.prepare('SELECT COUNT(*) AS c FROM translation_memories').get().c;
const memoryRows = () => runtime.sqlite.prepare('SELECT id, source, translated_text, hit_count, updated_at FROM translation_memories ORDER BY id').all().map(row => ({ ...row }));
const listMemories = async () => {
  const response = await translations.GET(new Request('https://example.test/api/translations'));
  return { status: response.status, body: await response.json() };
};
const rememberHandlers = [
  ['POST /api/translations/remember', body => call(remember.POST, body)],
  ['PUT /api/translations', body => call(translations.PUT, body)],
];
const translationsRoute = (method, path, body) => method(new Request(`https://example.test${path}`, { method: 'POST', body, headers: { 'content-type': 'application/json' } }));

test('translations: failed entitlement and memory reads return generic 500s with no text, query or values', async () => {
  for (const pattern of [/from "workspace_entitlements"/, /from "translation_memories"/]) {
    failExecution(pattern);
    assertSafe500(await listMemories(), { route: 'GET /api/translations', extraForbidden: memoryForbidden });
    failExecution(pattern);
    assertSafe500(await call(translations.POST, memoryInput), { route: 'POST /api/translations', extraForbidden: memoryForbidden });
  }
  failExecution(/from "translation_memories"/, customerDriverError());
  assertSafe500(await call(translations.POST, memoryInput), {
    route: 'POST /api/translations',
    sqliteCodes: ['SQLITE_CONSTRAINT', 'SQLITE_CONSTRAINT_NOTNULL'],
    extraForbidden: [...memoryForbidden, ...customerValues],
  });
  assert.equal(memoryCount(), 0);
});

test('translations: failed memory writes return generic 500s and keep stored memory as it was', async () => {
  // A provider result that cannot be stored must not be returned as a translation.
  runtime.provider.result = { status: 'translated', text: 'คำแปลสังเคราะห์จากผู้ให้บริการ', providerId: 'test', model: 'fixture' };
  failExecution(/^insert into "translation_memories"/);
  assertSafe500(await call(translations.POST, memoryInput), { route: 'POST /api/translations', extraForbidden: [...memoryForbidden, 'คำแปลสังเคราะห์จากผู้ให้บริการ'] });
  assert.equal(memoryCount(), 0, 'a provider translation that failed to save is not stored');

  assert.equal((await call(translations.POST, memoryInput)).status, 200, 'the same request succeeds once storage recovers');
  const before = memoryRows();
  failExecution(/^update "translation_memories"/);
  assertSafe500(await call(translations.POST, memoryInput), { route: 'POST /api/translations', extraForbidden: memoryForbidden });
  assert.deepEqual(memoryRows(), before, 'a failed hit update leaves the stored memory as it was');
});

test('translations: failed manual remembers return generic 500s on both entry points', async () => {
  for (const [route, send] of rememberHandlers) {
    for (const pattern of [/from "workspace_entitlements"/, /^insert into "translation_memories"/, /^select .*from "translation_memories"/]) {
      runtime.sqlite.exec('DELETE FROM translation_memories');
      failExecution(pattern);
      assertSafe500(await send(rememberInput), { route, extraForbidden: memoryForbidden });
    }
    runtime.sqlite.exec('DELETE FROM translation_memories');
    failExecution(/^insert into "translation_memories"/, customerDriverError());
    assertSafe500(await send(rememberInput), {
      route,
      sqliteCodes: ['SQLITE_CONSTRAINT', 'SQLITE_CONSTRAINT_NOTNULL'],
      extraForbidden: [...memoryForbidden, ...customerValues],
    });
    assert.equal(memoryCount(), 0, `${route}: a failed write stores nothing`);
  }
});

test('translations: storage that is not migrated yet keeps the Translation Memory message', async () => {
  const missing = () => new Error('D1_ERROR: no such table: translation_memories: SQLITE_ERROR');
  const cases = [
    ['GET /api/translations', () => listMemories()],
    ['POST /api/translations', () => call(translations.POST, memoryInput)],
    ...rememberHandlers.map(([route, send]) => [route, () => send(rememberInput)]),
  ];
  for (const [route, send] of cases) {
    failExecution(/from "translation_memories"|^insert into "translation_memories"/, missing());
    const result = await send();
    assertSafe500(result, { route, code: 'STORAGE_NOT_READY', extraForbidden: memoryForbidden });
    assert.equal(result.body.error, memoryStorageNotReady);
  }
});

// Malformed or empty JSON is the caller's error: one fixed 400 with no body
// text, parser message or log. JSON that is not an object, null included, gets
// each route's required-fields 400. Any other body read failure stays internal.
const bodyEntryPoints = [
  ['POST /api/translations', translations.POST, 'sourceText, sourceLanguage, and targetLanguage are required'],
  ['POST /api/translations/remember', remember.POST, 'sourceText, translatedText, sourceLanguage, and targetLanguage are required'],
  ['PUT /api/translations', translations.PUT, 'sourceText, translatedText, sourceLanguage, and targetLanguage are required'],
];
const sendBody = async (handler, body) => {
  const response = await translationsRoute(handler, '/api/translations', body);
  return { status: response.status, body: await response.json() };
};
// A stub request whose body read rejects with a generic error, whichever read
// method a route uses.
const failingBodyRead = () => {
  const fail = async () => { throw new Error(`synthetic body read failure on ${marker} token=${secret}`); };
  return { text: fail, json: fail, arrayBuffer: fail };
};

test('translations: malformed or empty JSON gets one fixed 400 that never echoes the body or parser text', async () => {
  const malformed = [
    `{"sourceText": "${memoryInput.sourceText}", token=${secret}`,
    `${marker} token=${secret} ${rememberInput.translatedText}`,
    '',
  ];
  for (const [route, handler] of bodyEntryPoints) {
    for (const body of malformed) {
      assert.deepEqual(await sendBody(handler, body), { status: 400, body: { error: 'request body must be valid JSON' } }, `${route} ${JSON.stringify(body.slice(0, 14))}`);
    }
  }
  assert.deepEqual(logs, [], 'client body errors are not logged, so no parser text or request content reaches a log');
  assert.equal(memoryCount(), 0);

  // Entitlement is still checked before the body is read.
  runtime.sqlite.prepare("INSERT INTO workspace_entitlements (workspace_id, workspace_name, module_ids, connector_ids, status, activated_at, updated_at) VALUES ('nirva-workspace', 'W', '[]', '[]', 'active', 1, 1)").run();
  for (const [route, handler] of bodyEntryPoints) {
    assert.deepEqual(await sendBody(handler, malformed[0]), { status: 403, body: { error: 'Language Engine is not included in the active workspace solution' } }, route);
  }
  assert.deepEqual(logs, []);
});

test('translations: JSON null and other non-object bodies get the existing required-fields 400', async () => {
  for (const [route, handler, required] of bodyEntryPoints) {
    for (const body of ['null', '42', 'true', '"text"', '[]']) {
      assert.deepEqual(await sendBody(handler, body), { status: 400, body: { error: required } }, `${route} ${body}`);
    }
  }
  assert.deepEqual(logs, [], 'validation answers are not logged');
  assert.equal(memoryCount(), 0);
});

test('translations: a body read failure that is not a JSON syntax error stays internal: generic 500, one allowlisted log', async () => {
  const url = 'https://example.test/api/translations';
  for (const [route, handler] of bodyEntryPoints) {
    const consumed = new Request(url, { method: 'POST', body: JSON.stringify(rememberInput), headers: { 'content-type': 'application/json' } });
    await consumed.text();
    for (const [label, request] of [
      ['reading the body rejects with a generic error', failingBodyRead()],
      ['the body stream fails while it is read', new Request(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        duplex: 'half',
        body: new ReadableStream({ start(controller) { controller.error(new Error(`synthetic stream failure on ${marker} token=${secret}`)); } }),
      })],
      ['the body was already consumed', consumed],
    ]) {
      const response = await handler(request);
      const result = { status: response.status, body: await response.json() };
      assert.equal(result.status, 500, `${route}: ${label}`);
      assertSafe500(result, {
        route,
        sqliteCodes: [],
        extraForbidden: [...memoryForbidden, 'synthetic body read failure', 'synthetic stream failure', 'unusable'],
      });
    }
  }
  assert.equal(memoryCount(), 0);
});

test('translations: 4xx, provider and canonical answers keep their exact bodies and are not logged', async () => {
  for (const [body, status, expected] of [
    [{ sourceLanguage: 'en', targetLanguage: 'th' }, 400, { error: 'sourceText, sourceLanguage, and targetLanguage are required' }],
    [{ ...memoryInput, targetLanguage: 'xx' }, 400, { error: 'sourceLanguage and targetLanguage must be supported language codes' }],
    [{ ...memoryInput, sourceText: 'x'.repeat(20_001) }, 413, { error: 'sourceText exceeds 20000 characters' }],
    [{ ...memoryInput, canonical: 'not-an-association' }, 400, { error: 'canonical must be a concept/version association' }],
  ]) {
    const result = await call(translations.POST, body);
    assert.equal(result.status, status, JSON.stringify(Object.keys(body)));
    assert.deepEqual(result.body, expected);
  }
  for (const [route, send] of rememberHandlers) {
    for (const [body, status, expected] of [
      [{ ...rememberInput, translatedText: '' }, 400, { error: 'sourceText, translatedText, sourceLanguage, and targetLanguage are required' }],
      [{ ...rememberInput, sourceLanguage: 'xx' }, 400, { error: 'sourceLanguage and targetLanguage must be supported language codes' }],
      [{ ...rememberInput, translatedText: 'x'.repeat(20_001) }, 413, { error: 'translation text exceeds 20000 characters' }],
      [{ ...rememberInput, canonical: { concept_id: 'unknown-concept', source_concept_version: '0.1.0' } }, 400, { error: 'Unknown canonical concept or source_concept_version' }],
    ]) {
      const result = await send(body);
      assert.equal(result.status, status, `${route} ${JSON.stringify(Object.keys(body))}`);
      assert.deepEqual(result.body, expected);
    }
  }

  const unavailable = await call(translations.POST, memoryInput);
  assert.equal(unavailable.status, 503);
  assert.deepEqual(unavailable.body.error, { code: 'TRANSLATION_PROVIDER_UNAVAILABLE', message: 'No translation provider credential is configured' });
  assert.equal(unavailable.body.translation.text, null);
  runtime.provider.result = { status: 'failed', providerId: 'test', reason: 'provider_http_500' };
  const failed = await call(translations.POST, memoryInput);
  assert.equal(failed.status, 502);
  assert.deepEqual(failed.body.error, { code: 'TRANSLATION_PROVIDER_FAILED', message: 'provider_http_500' });
  assert.equal(failed.body.translation.text, null);
  assert.equal(memoryCount(), 0, 'no fabricated translation is stored');

  runtime.sqlite.prepare("INSERT INTO workspace_entitlements (workspace_id, workspace_name, module_ids, connector_ids, status, activated_at, updated_at) VALUES ('nirva-workspace', 'W', '[]', '[]', 'active', 1, 1)").run();
  const notEntitled = { error: 'Language Engine is not included in the active workspace solution' };
  assert.deepEqual(await listMemories(), { status: 403, body: notEntitled });
  assert.deepEqual(await call(translations.POST, memoryInput), { status: 403, body: notEntitled });
  for (const [route, send] of rememberHandlers) assert.deepEqual(await send(rememberInput), { status: 403, body: notEntitled }, route);
  assert.deepEqual(logs, [], '4xx and provider answers are not logged as internal errors');
});

// /api/languages: synthetic input only. The route uses no storage; its fixed
// client answers never echo the request body or exception text.
const languages = runtime.route('app/api/languages/route.ts');
const localization = runtime.route('lib/nle/localization.ts');
const { NIRVA_LANGUAGES, NIRVA_LANGUAGE_COUNT } = runtime.route('lib/nle/languages.ts');
const asJson = value => JSON.parse(JSON.stringify(value));
const postLanguages = async body => {
  const response = await languages.POST(new Request('https://example.test/api/languages', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  }));
  return { status: response.status, body: await response.json() };
};
const invalidJsonAnswer = { status: 400, body: { error: 'request body must be valid JSON' } };
const invalidLocalizeAnswer = { status: 400, body: { error: 'locale, date, currency or timezone is invalid' } };
const noActionAnswer = { status: 400, body: { error: 'action must be detect or localize' } };

test('languages: malformed JSON gets a fixed 400 that never echoes the body or parser text', async () => {
  for (const body of [`${marker} token=${secret}`, `{"action":"localize","locale":"${marker}"`, '']) {
    assert.deepEqual(await postLanguages(body), invalidJsonAnswer, `body starting ${JSON.stringify(body.slice(0, 12))}`);
  }
  // null has no action, like every other JSON value that is not an object.
  assert.deepEqual(await postLanguages('null'), noActionAnswer);
  assert.deepEqual(logs, [], 'client input errors are not logged as internal errors');
});

test('languages: a localize failure carrying a synthetic marker gets a fixed 400 without exception text', async () => {
  for (const input of [
    { locale: marker, number: 1 },
    { locale: 'en', currencyAmount: 5, currency: marker },
    { locale: 'en', date: '2026-10-20T00:00:00Z', timezone: `Leak/${marker}` },
    { locale: 'en', date: `not-a-date ${marker}` },
  ]) {
    assert.deepEqual(await postLanguages({ action: 'localize', ...input }), invalidLocalizeAnswer, Object.keys(input).join(','));
  }
  assert.deepEqual(logs, [], 'rejected input is not logged');
});

test('languages: an unexpected internal failure returns the shared generic 500 and an allowlisted diagnostic', async () => {
  const detect = localization.detectLanguageByScript;
  localization.detectLanguageByScript = () => { throw new Error(`synthetic detector failure on ${marker} token=${secret}`); };
  try {
    const result = await postLanguages({ action: 'detect', text: `private note ${marker}` });
    assertSafe500(result, { route: 'POST /api/languages', sqliteCodes: [], extraForbidden: ['synthetic detector failure', 'private note'] });
  } finally {
    localization.detectLanguageByScript = detect;
  }
});

test('languages: GET, detect, localize and explicit validation answers are unchanged and not logged', async () => {
  const listed = await languages.GET();
  assert.equal(listed.status, 200);
  const catalog = await listed.json();
  assert.deepEqual(Object.keys(catalog), ['count', 'languages', 'capabilities', 'provider']);
  assert.equal(catalog.count, NIRVA_LANGUAGE_COUNT);
  assert.deepEqual(catalog.languages, asJson(NIRVA_LANGUAGES));
  assert.deepEqual(catalog.capabilities, {
    registry: 'active', curatedStudioCopy: 'active', rtlLayout: 'active', scriptDetection: 'active',
    intlLocalization: 'active', providerTranslation: 'unavailable', translationMemory: 'active', speechToText: 'integration_required',
  });
  for (const text of ['สวัสดี Nirva', 'مرحبا بالعالم', 'Hello world', '!!! 123']) {
    const detection = localization.detectLanguageByScript(text);
    const languageInfo = NIRVA_LANGUAGES.find(language => language.code === detection.language) ?? null;
    assert.deepEqual(await postLanguages({ action: 'detect', text }), { status: 200, body: asJson({ detection, languageInfo }) }, text);
  }
  for (const input of [
    { number: 1234.5, currencyAmount: 99, date: '2026-10-20T00:00:00Z' },
    { locale: 'ar', number: 1234.5, currencyAmount: 99, date: '2026-10-20T00:00:00Z' },
    { locale: 'en', currencyAmount: 99, currency: 'EUR', date: '2026-10-20T00:00:00Z', timezone: 'Europe/Paris' },
    {},
  ]) {
    const { locale = 'th', currency, timezone, number, currencyAmount, date } = input;
    const localized = localization.localize({ number, currencyAmount, date }, { locale, currency, timezone });
    assert.deepEqual(await postLanguages({ action: 'localize', ...input }), { status: 200, body: asJson({ localized }) }, JSON.stringify(input));
  }
  for (const [body, answer] of [
    [{ action: 'detect' }, { status: 400, body: { error: 'text is required' } }],
    [{ action: 'detect', text: '   ' }, { status: 400, body: { error: 'text is required' } }],
    [{ action: 'other' }, noActionAnswer],
    [{}, noActionAnswer],
    [[], noActionAnswer],
    ['42', noActionAnswer],
    ['"detect"', noActionAnswer],
  ]) {
    assert.deepEqual(await postLanguages(body), answer, JSON.stringify(body));
  }
  assert.deepEqual(logs, [], 'successful and validation answers are not logged');
});

// Only a JSON syntax error or a typed LocalizationInputError is the client's
// fault; every other failure is internal and gets the shared generic 500.
const localizeRequest = { action: 'localize', locale: 'en', number: 1234.5, currencyAmount: 99, date: '2026-10-20T00:00:00Z' };

test('languages: known invalid localize input throws a typed LocalizationInputError without the rejected value', () => {
  const { LocalizationInputError } = localization;
  assert.equal(typeof LocalizationInputError, 'function', 'lib/nle/localization.ts exports a typed input error');
  for (const [field, data, options] of [
    ['locale', { number: 1 }, { locale: marker }],
    ['date', { date: `not-a-date ${marker}` }, { locale: 'en' }],
    ['currency', { currencyAmount: 5 }, { locale: 'en', currency: marker }],
    ['timezone', { date: '2026-10-20T00:00:00Z' }, { locale: 'en', timezone: `Leak/${marker}` }],
  ]) {
    assert.throws(() => localization.localize(data, options), error => {
      assert.ok(error instanceof LocalizationInputError, `${field}: typed input error, not ${error?.constructor?.name}`);
      assert.equal(error.field, field);
      assert.equal(error.message.includes(marker), false, `${field}: the error omits the rejected value`);
      return true;
    }, field);
  }
});

test('languages: an unexpected localize failure is internal: generic 500, one allowlisted log, no marker', async () => {
  const localize = localization.localize;
  try {
    for (const failure of [
      new Error(`synthetic formatter failure on ${marker} token=${secret}`),
      new RangeError(`synthetic Intl failure on ${marker} token=${secret}`),
    ]) {
      localization.localize = () => { throw failure; };
      const result = await postLanguages(localizeRequest);
      assert.equal(result.status, 500, `${failure.name} from localize`);
      assertSafe500(result, {
        route: 'POST /api/languages',
        sqliteCodes: [],
        extraForbidden: ['synthetic formatter failure', 'synthetic Intl failure', 'RangeError'],
      });
    }
  } finally {
    localization.localize = localize;
  }
});

test('languages: a body read failure that is not a JSON syntax error is internal: generic 500, one allowlisted log', async () => {
  const url = 'https://example.test/api/languages';
  const consumed = new Request(url, { method: 'POST', body: JSON.stringify({ action: 'detect', text: `private note ${marker}` }), headers: { 'content-type': 'application/json' } });
  await consumed.text();
  for (const [label, request] of [
    ['reading the body rejects with a generic error', failingBodyRead()],
    ['the body stream fails while it is read', new Request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      duplex: 'half',
      body: new ReadableStream({ start(controller) { controller.error(new Error(`synthetic stream failure on ${marker} token=${secret}`)); } }),
    })],
    ['the body was already consumed', consumed],
  ]) {
    const response = await languages.POST(request);
    const result = { status: response.status, body: await response.json() };
    assert.equal(result.status, 500, label);
    assertSafe500(result, {
      route: 'POST /api/languages',
      sqliteCodes: [],
      extraForbidden: ['synthetic body read failure', 'synthetic stream failure', 'private note', 'unusable'],
    });
  }
});

// A body stream can fail with any error type, a SyntaxError included. That is
// a failure to read the request, not malformed JSON from the client, so it
// stays internal on every JSON body route. Synthetic in-memory streams only.
const syntaxErrorStream = (url, partialBody) => new Request(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  duplex: 'half',
  body: new ReadableStream({
    start(controller) {
      if (partialBody) controller.enqueue(new TextEncoder().encode(partialBody));
      controller.error(new SyntaxError(`synthetic stream failure on ${marker} token=${secret}`));
    },
  }),
});

test('cancel: malformed or empty JSON gets a fixed 400, and null uses the missing-postId 400', async () => {
  const { post, job } = await scheduledPost();
  const before = state(post, job);
  const url = 'https://example.test/api/publish-jobs/cancel';
  for (const body of [`{"postId":"${marker}"`, `${marker} token=${secret}`, '']) {
    const response = await cancelRoute.POST(new Request(url, { method: 'POST', body, headers: { 'content-type': 'application/json' } }), context(job.id));
    assert.deepEqual({ status: response.status, body: await response.json() },
      { status: 400, body: { error: 'request body must be valid JSON' } });
    assert.deepEqual(logs, []);
    assert.deepEqual(state(post, job), before);
  }
  const response = await cancelRoute.POST(request(null), context(job.id));
  assert.deepEqual({ status: response.status, body: await response.json() },
    { status: 400, body: { error: 'postId of the scheduled post is required' } });
  assert.deepEqual(logs, []);
  assert.deepEqual(state(post, job), before);
});

test('cancel: body-read failures, even SyntaxError streams, are internal 500s with one safe log and no write', async () => {
  const { post, job } = await scheduledPost();
  const before = state(post, job);
  const url = 'https://example.test/api/publish-jobs/cancel';
  const consumed = new Request(url, { method: 'POST', body: JSON.stringify({ postId: post.id }) });
  await consumed.text();
  const requests = [
    failingBodyRead(),
    new Request(url, {
      method: 'POST', duplex: 'half',
      body: new ReadableStream({ start(controller) { controller.error(new Error(`synthetic stream failure on ${marker} token=${secret}`)); } }),
    }),
    consumed,
    syntaxErrorStream(url),
    syntaxErrorStream(url, `{"postId":"${marker}"`),
  ];
  for (const badRequest of requests) {
    const response = await cancelRoute.POST(badRequest, context(job.id));
    assertSafe500({ status: response.status, body: await response.json() }, {
      route: 'POST /api/publish-jobs/:id/cancel',
      ids: [post.id, job.id],
      sqliteCodes: [],
      extraForbidden: ['synthetic body read failure', 'synthetic stream failure', 'unusable', 'SyntaxError'],
    });
    assert.deepEqual(state(post, job), before);
  }
});
const jsonBodyRoutes = [
  ['POST /api/languages', languages.POST, 'https://example.test/api/languages', `{"action":"detect","text":"private note ${marker}"`],
  ['POST /api/translations', translations.POST, 'https://example.test/api/translations', `{"sourceText":"${memoryInput.sourceText}"`],
  ['PUT /api/translations', translations.PUT, 'https://example.test/api/translations', `{"sourceText":"${memoryInput.sourceText}","translatedText":"${rememberInput.translatedText}"`],
  ['POST /api/translations/remember', remember.POST, 'https://example.test/api/translations/remember', `{"sourceText":"${memoryInput.sourceText}","translatedText":"${rememberInput.translatedText}"`],
];

test('json body routes: a body stream that fails with a SyntaxError is internal: generic 500, one allowlisted log, no marker', async () => {
  for (const [route, handler, url, partialBody] of jsonBodyRoutes) {
    for (const [label, partial] of [['at the start', undefined], ['after a partial body', partialBody]]) {
      const response = await handler(syntaxErrorStream(url, partial));
      const result = { status: response.status, body: await response.json() };
      assert.equal(result.status, 500, `${route}: SyntaxError stream ${label}`);
      assertSafe500(result, {
        route,
        sqliteCodes: [],
        extraForbidden: [...memoryForbidden, 'synthetic stream failure', 'private note', 'SyntaxError', 'valid JSON'],
      });
    }
  }
  assert.equal(memoryCount(), 0);
});

test('translations: with Language Engine off a failing body stream is never read: 403 and no log', async () => {
  runtime.sqlite.prepare("INSERT INTO workspace_entitlements (workspace_id, workspace_name, module_ids, connector_ids, status, activated_at, updated_at) VALUES ('nirva-workspace', 'W', '[]', '[]', 'active', 1, 1)").run();
  for (const [route, handler, url, partialBody] of jsonBodyRoutes.filter(([route]) => route.includes('/api/translations'))) {
    const request = syntaxErrorStream(url, partialBody);
    const response = await handler(request);
    assert.deepEqual({ status: response.status, body: await response.json() }, { status: 403, body: { error: 'Language Engine is not included in the active workspace solution' } }, route);
    assert.equal(request.bodyUsed, false, `${route}: entitlement is checked before the body is read`);
  }
  assert.deepEqual(logs, []);
});

// POST /api/publish-jobs: synthetic posts only, no account, OAuth or publishing.
// Malformed or empty JSON is the caller's error: one fixed 400, no log, no
// write. JSON that is not an object, null included, gets the route's existing
// required-input 400. Any failure to read the body stays internal.
const publishJobsUrl = 'https://example.test/api/publish-jobs';
const sendPublishJobsBody = async body => {
  const response = await jobs.POST(new Request(publishJobsUrl, { method: 'POST', body, headers: { 'content-type': 'application/json' } }));
  return { status: response.status, body: await response.json() };
};

test('publish-jobs: malformed or empty JSON gets one fixed 400 that never echoes the body or parser text, and writes nothing', async () => {
  const post = await approvedPost();
  const before = state(post, null);
  for (const body of [
    `{"postId":"${post.id}","channel":"Facebook","scheduledAt":"${whenIso}"`,
    `${marker} token=${secret}`,
    '',
  ]) {
    assert.deepEqual(await sendPublishJobsBody(body), { status: 400, body: { error: 'request body must be valid JSON' } }, JSON.stringify(body.slice(0, 16)));
  }
  assert.deepEqual(logs, [], 'client body errors are not logged, so no parser text or request content reaches a log');
  assert.deepEqual(state(post, null), before, 'no post, job or audit write');
});

test('publish-jobs: JSON null and other non-object bodies get the fixed required-input 400', async () => {
  const post = await approvedPost();
  const before = state(post, null);
  for (const body of ['null', '42', 'true', '"text"', '[]']) {
    assert.deepEqual(await sendPublishJobsBody(body), { status: 400, body: { error: 'a supported channel is required' } }, body);
  }
  assert.deepEqual(logs, [], 'validation answers are not logged');
  assert.deepEqual(state(post, null), before);
});

test('publish-jobs: body-read failures, even SyntaxError streams, are internal 500s with one allowlisted log and no write', async () => {
  const post = await approvedPost();
  const before = state(post, null);
  const validBody = JSON.stringify({ postId: post.id, channel: 'Facebook', scheduledAt: whenIso });
  const consumed = new Request(publishJobsUrl, { method: 'POST', body: validBody, headers: { 'content-type': 'application/json' } });
  await consumed.text();
  for (const [label, badRequest] of [
    ['reading the body rejects with a generic error', failingBodyRead()],
    ['the body stream fails with a generic error', new Request(publishJobsUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      duplex: 'half',
      body: new ReadableStream({ start(controller) { controller.error(new Error(`synthetic stream failure on ${marker} token=${secret}`)); } }),
    })],
    ['the body was already consumed', consumed],
    ['the body stream fails with a SyntaxError at the start', syntaxErrorStream(publishJobsUrl)],
    ['the body stream fails with a SyntaxError after a partial valid body', syntaxErrorStream(publishJobsUrl, validBody.slice(0, -1))],
  ]) {
    const response = await jobs.POST(badRequest);
    const result = { status: response.status, body: await response.json() };
    assert.equal(result.status, 500, label);
    assertSafe500(result, {
      route: 'POST /api/publish-jobs',
      ids: [post.id],
      sqliteCodes: [],
      extraForbidden: ['synthetic body read failure', 'synthetic stream failure', 'unusable', 'SyntaxError', 'valid JSON'],
    });
    assert.deepEqual(state(post, null), before, `${label}: no post, job or audit write`);
  }
});

// POST /api/campaigns: synthetic briefs only, no account, OAuth or publishing.
// Malformed or empty JSON is the caller's error: one fixed 400, no log, no
// campaign or post write. JSON that is not an object, null included, gets the
// route's existing brief-required 400. Any failure to read the body stays
// internal.
const campaignsUrl = 'https://example.test/api/campaigns';
const campaignBody = JSON.stringify({ brief: `Synthetic brief ${marker}`, language: 'en', channels: ['Facebook'] });
const sendCampaignsBody = async body => {
  const response = await campaigns.POST(new Request(campaignsUrl, { method: 'POST', body, headers: { 'content-type': 'application/json' } }));
  return { status: response.status, body: await response.json() };
};
const campaignCounts = () => ({
  campaigns: runtime.sqlite.prepare('SELECT COUNT(*) AS c FROM campaigns').get().c,
  posts: runtime.sqlite.prepare('SELECT COUNT(*) AS c FROM campaign_posts').get().c,
});

test('campaigns: malformed or empty JSON gets one fixed 400 that never echoes the body or parser text, and writes nothing', async () => {
  for (const body of [campaignBody.slice(0, -1), `${marker} token=${secret}`, '', ' \n\t ']) {
    assert.deepEqual(await sendCampaignsBody(body), { status: 400, body: { error: 'request body must be valid JSON' } }, JSON.stringify(body.slice(0, 16)));
  }
  assert.deepEqual(logs, [], 'client body errors are not logged, so no parser text or request content reaches a log');
  assert.deepEqual(campaignCounts(), { campaigns: 0, posts: 0 }, 'no campaign or post write');
});

test('campaigns: JSON null and other non-object bodies get the fixed brief-required 400', async () => {
  for (const body of ['null', '42', 'true', '"text"', '[]']) {
    assert.deepEqual(await sendCampaignsBody(body), { status: 400, body: { error: 'brief is required' } }, body);
  }
  assert.deepEqual(logs, [], 'validation answers are not logged');
  assert.deepEqual(campaignCounts(), { campaigns: 0, posts: 0 }, 'no campaign or post write');
});

test('campaigns: body-read failures, even SyntaxError streams, are internal 500s with one allowlisted log and no write', async () => {
  const consumed = new Request(campaignsUrl, { method: 'POST', body: campaignBody, headers: { 'content-type': 'application/json' } });
  await consumed.text();
  for (const [label, badRequest] of [
    ['reading the body rejects with a generic error', failingBodyRead()],
    ['the body stream fails with a generic error', new Request(campaignsUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      duplex: 'half',
      body: new ReadableStream({ start(controller) { controller.error(new Error(`synthetic stream failure on ${marker} token=${secret}`)); } }),
    })],
    ['the body was already consumed', consumed],
    ['the body stream fails with a SyntaxError at the start', syntaxErrorStream(campaignsUrl)],
    ['the body stream fails with a SyntaxError after a partial valid body', syntaxErrorStream(campaignsUrl, campaignBody.slice(0, -1))],
  ]) {
    const response = await campaigns.POST(badRequest);
    const result = { status: response.status, body: await response.json() };
    assert.equal(result.status, 500, label);
    assertSafe500(result, {
      route: 'POST /api/campaigns',
      sqliteCodes: [],
      extraForbidden: ['synthetic body read failure', 'synthetic stream failure', 'Synthetic brief', 'unusable', 'SyntaxError', 'valid JSON'],
    });
    assert.deepEqual(campaignCounts(), { campaigns: 0, posts: 0 }, `${label}: no campaign or post write`);
  }
});

// POST /api/campaigns field types. A missing or null field keeps its meaning
// (required, or the default). Any other value of the wrong type is the
// client's error: the field's fixed 400, which never echoes the value, no log
// and no campaign or post write.
const campaignInput = { brief: 'Synthetic', language: 'en', channels: ['Facebook'] };
const briefRequired = { error: 'brief is required' };
const languageUnsupported = { error: 'language is not supported by the 21-language NLE registry' };
const toneNotString = { error: 'tone must be a string' };
const channelRequired = { error: 'at least one supported channel is required' };

for (const [field, values, expected] of [
  ['brief', [5, 0, true, false, {}, { text: marker }, [], [marker]], briefRequired],
  ['language', [5, true, {}, ['en'], { code: marker }], languageUnsupported],
  ['tone', [5, true, {}, ['warm'], { value: marker }], toneNotString],
  // A string is not a channel list even though it is iterable: "X" and
  // "Xiaohongshu" were read one character at a time and saved an X campaign.
  ['channels', [5, true, {}, { Facebook: true }, 'Facebook', 'X', 'Xiaohongshu', [['Facebook']], [['Facebook'], 'Instagram'], ['Facebook', 5], ['Facebook', null], [{ name: marker }]], channelRequired],
]) {
  test(`campaigns: a wrong-typed ${field} gets its fixed 400 with no echo, log or write`, async () => {
    for (const value of values) {
      assert.deepEqual(await call(campaigns.POST, { ...campaignInput, [field]: value }), { status: 400, body: expected }, `${field}: ${JSON.stringify(value)}`);
    }
    assert.deepEqual(logs, [], 'validation answers are not logged');
    assert.deepEqual(campaignCounts(), { campaigns: 0, posts: 0 }, 'no campaign or post write');
  });
}

test('campaigns: misspelled language and channel names keep their fixed 400s, and inherited names are not channels', async () => {
  for (const language of ['EN', 'eng', 'en-US', 'english', 'Thai', 'zh-TW', 'toString', '__proto__', marker]) {
    assert.deepEqual(await call(campaigns.POST, { ...campaignInput, language }), { status: 400, body: languageUnsupported }, language);
  }
  // Names inherited from Object.prototype are not channel templates.
  for (const channel of ['facebook', 'Facebok', 'LINE', 'Line OA', 'Tiktok', 'twitter', marker, 'toString', 'constructor', '__proto__', 'hasOwnProperty', 'valueOf']) {
    assert.deepEqual(await call(campaigns.POST, { ...campaignInput, channels: [channel] }), { status: 400, body: channelRequired }, channel);
  }
  assert.deepEqual(logs, [], 'validation answers are not logged');
  assert.deepEqual(campaignCounts(), { campaigns: 0, posts: 0 }, 'no campaign or post write');
  // As before, unsupported names next to a supported channel are dropped; an
  // inherited name is dropped the same way instead of failing the save.
  for (const channels of [['Facebook', 'facebook', 'Nope'], ['Facebook', 'toString', 'constructor']]) {
    const saved = await call(campaigns.POST, { ...campaignInput, channels });
    assert.equal(saved.status, 201, JSON.stringify(channels));
    assert.deepEqual(saved.body.campaign.channels, ['Facebook']);
    assert.deepEqual(saved.body.campaign.posts.map(post => post.channel), ['Facebook']);
  }
  assert.deepEqual(campaignCounts(), { campaigns: 2, posts: 2 });
  assert.deepEqual(logs, []);
});

test('campaigns: missing or null fields keep their existing required or default meaning', async () => {
  assert.deepEqual(await call(campaigns.POST, { ...campaignInput, brief: null }), { status: 400, body: briefRequired });
  assert.deepEqual(await call(campaigns.POST, { ...campaignInput, channels: null }), { status: 400, body: channelRequired });
  for (const [input, language, tone] of [
    [{ ...campaignInput, language: null, tone: null }, 'th', 'อบอุ่นและมั่นใจ'],
    [{ brief: 'Synthetic', channels: ['Facebook'] }, 'th', 'อบอุ่นและมั่นใจ'],
    [{ ...campaignInput, brief: '  Synthetic  ', language: ' en ', tone: '' }, 'en', ''],
  ]) {
    const saved = await call(campaigns.POST, input);
    assert.equal(saved.status, 201, JSON.stringify(input));
    assert.deepEqual([saved.body.campaign.brief, saved.body.campaign.language, saved.body.campaign.tone], ['Synthetic', language, tone]);
  }
  assert.deepEqual(logs, []);
});

// PUT /api/entitlements: synthetic solutions only, no account, OAuth or
// publishing. Malformed or empty JSON is the caller's error: one fixed 400, no
// log and no entitlement write. JSON that is not an object, null included,
// gets the route's existing solutionConfigId-required 400. Any failure to read
// the body stays internal.
const entitlementsUrl = 'https://example.test/api/entitlements';
const sendEntitlementsBody = async body => {
  const response = await entitlements.PUT(new Request(entitlementsUrl, { method: 'PUT', body, headers: { 'content-type': 'application/json' } }));
  return { status: response.status, body: await response.json() };
};
const entitlementState = () => ({
  entitlements: runtime.sqlite.prepare('SELECT * FROM workspace_entitlements ORDER BY workspace_id').all().map(row => ({ ...row })),
  solutions: runtime.sqlite.prepare('SELECT COUNT(*) AS c FROM solution_configs').get().c,
});
const syntheticSolution = async () => {
  const saved = await call(solutions.POST, { name: 'Synthetic entitlement solution', moduleIds: ['content-studio'], connectorIds: ['meta-network'] });
  assert.equal(saved.status, 201);
  return saved.body.solution;
};

test('entitlements: malformed or empty JSON gets one fixed 400 that never echoes the body or parser text, and writes nothing', async () => {
  const solution = await syntheticSolution();
  const rejected = [JSON.stringify({ solutionConfigId: solution.id }).slice(0, -1), `${marker} token=${secret}`, '', ' \n\t '];
  const rejectAll = async stage => {
    for (const body of rejected) {
      assert.deepEqual(await sendEntitlementsBody(body), { status: 400, body: { error: 'request body must be valid JSON' } }, `${stage}: ${JSON.stringify(body.slice(0, 16))}`);
    }
  };

  // Nothing is stored yet: a rejected body must not create the entitlement.
  const empty = entitlementState();
  await rejectAll('no entitlement stored');
  assert.deepEqual(entitlementState(), empty, 'no entitlement created');

  // A stored entitlement stays exactly as it was.
  assert.equal((await call(entitlements.PUT, { solutionConfigId: solution.id })).status, 200);
  const active = entitlementState();
  assert.equal(active.entitlements.length, 1);
  await rejectAll('entitlement stored');
  assert.deepEqual(entitlementState(), active, 'the stored entitlement is unchanged');
  assert.deepEqual(logs, [], 'client body errors are not logged, so no parser text or request content reaches a log');
});

test('entitlements: JSON null and other non-object bodies get the fixed solutionConfigId-required 400', async () => {
  const solution = await syntheticSolution();
  const before = entitlementState();
  for (const body of ['null', '42', 'true', '"text"', '[]']) {
    assert.deepEqual(await sendEntitlementsBody(body), { status: 400, body: { error: 'solutionConfigId is required' } }, body);
  }
  assert.deepEqual(logs, [], 'validation answers are not logged');
  assert.deepEqual(entitlementState(), before, 'nothing is activated');

  // A valid request still activates the saved solution.
  const activated = await sendEntitlementsBody(JSON.stringify({ solutionConfigId: solution.id }));
  assert.equal(activated.status, 200);
  assert.equal(activated.body.entitlement.solutionConfigId, solution.id);
  assert.deepEqual(logs, []);
});

test('entitlements: body-read failures, even SyntaxError streams, are internal 500s with one allowlisted log and no write', async () => {
  const solution = await syntheticSolution();
  const before = entitlementState();
  const validBody = JSON.stringify({ solutionConfigId: solution.id });
  const consumed = new Request(entitlementsUrl, { method: 'PUT', body: validBody, headers: { 'content-type': 'application/json' } });
  await consumed.text();
  for (const [label, badRequest] of [
    ['reading the body rejects with a generic error', failingBodyRead()],
    ['the body stream fails with a generic error', new Request(entitlementsUrl, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      duplex: 'half',
      body: new ReadableStream({ start(controller) { controller.error(new Error(`synthetic stream failure on ${marker} token=${secret}`)); } }),
    })],
    ['the body was already consumed', consumed],
    ['the body stream fails with a SyntaxError at the start', syntaxErrorStream(entitlementsUrl)],
    ['the body stream fails with a SyntaxError after a partial valid body', syntaxErrorStream(entitlementsUrl, validBody.slice(0, -1))],
  ]) {
    const response = await entitlements.PUT(badRequest);
    const result = { status: response.status, body: await response.json() };
    assert.equal(result.status, 500, label);
    assertSafe500(result, {
      route: 'PUT /api/entitlements',
      ids: [solution.id],
      sqliteCodes: [],
      extraForbidden: ['synthetic body read failure', 'synthetic stream failure', 'unusable', 'SyntaxError', 'valid JSON'],
    });
    assert.deepEqual(entitlementState(), before, `${label}: no entitlement write`);
  }
});
