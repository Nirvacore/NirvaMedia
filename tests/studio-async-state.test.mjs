import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import test, { after } from 'node:test';
import ts from 'typescript';
import { mediaRuntime } from './helpers/media-runtime.mjs';

const runtime = mediaRuntime();
after(() => runtime.close());
const source = readFileSync(new URL('../app/studio/page.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;

// Render the actual component with persistent hook slots and deferred network
// responses. Event handlers and state updates are product code, not copies.
function studio() {
  const slots = [];
  const requests = [];
  let cursor = 0;
  let tree;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect() {},
  };
  const context = {
    exports: {},
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      return runtime.route(resolve('app/studio', name).slice(process.cwd().length + 1) + '.ts');
    },
    fetch(url, options) {
      return new Promise((resolve, reject) => requests.push({ url, payload: JSON.parse(options.body), resolve, reject }));
    },
  };
  vm.createContext(context);
  vm.runInContext(compiled, context);
  function render() { cursor = 0; tree = context.exports.default(); }
  function find(predicate, node = tree) {
    if (!node || typeof node !== 'object') return undefined;
    if (Array.isArray(node)) return node.map(child => find(predicate, child ?? null)).find(Boolean);
    if (predicate(node)) return node;
    return find(predicate, node.props?.children ?? null);
  }
  render();
  return {
    requests, render,
    node: predicate => find(predicate),
    field: id => find(node => node.props?.id === id),
    button: className => find(node => node.type === 'button' && node.props?.className === className),
    change(id, value) { find(node => node.props?.id === id).props.onChange({ target: { value } }); render(); },
    translate() { return find(node => node.type === 'button' && node.props?.onClick?.name === 'translateFreeText').props.onClick(); },
    save() { return find(node => node.type === 'button' && node.props?.onClick?.name === 'saveManualTranslation').props.onClick(); },
    answer(index, data, ok = true, status = ok ? 200 : 400) { requests[index].resolve({ ok, status, json: async () => data }); },
    output() { return find(node => node.props?.className?.startsWith('translation-output')); },
  };
}
const translation = text => ({ translation: { text, source: 'memory' } });
const campaign = (id, language = 'en') => ({ id, brief: id, language, tone: 'อบอุ่นและมั่นใจ', channels: ['Instagram'], createdAt: 1,
  posts: [{ id: `${id}-post`, campaignId: id, channel: 'Instagram', body: `${id}-body`, title: id, status: 'draft', createdAt: 1 }] });

for (const field of ['source-language', 'target-language', 'translation-source']) {
  test(`late translation does not restore a result after editing ${field}`, async () => {
    const app = studio();
    const pending = app.translate();
    app.change(field, field === 'translation-source' ? 'new source' : 'ja');
    app.answer(0, translation('old English response'));
    await pending;
    app.render();
    assert.equal(app.output().props.className, 'translation-output idle');
  });
}

test('stale failure cannot replace a newer translation; pending stays active until overlapping requests finish', async () => {
  const app = studio();
  const first = app.translate();
  app.change('target-language', 'ja');
  const second = app.translate();
  app.requests[0].reject(new Error('old failure'));
  await first;
  app.render();
  assert.equal(app.output().props.children.props.className, 'translation-loading');
  app.answer(1, translation('こんにちは'));
  await second;
  app.render();
  assert.equal(app.output().props.children.props.children, 'こんにちは');
});

test('manual save completion preserves newer manual text and does not restore stale success', async () => {
  const app = studio();
  const lookup = app.translate();
  app.answer(0, { message: 'unavailable' }, false);
  await lookup; app.render();
  app.change('manual-translation', 'first manual');
  const save = app.save();
  app.change('manual-translation', 'newer manual');
  app.answer(1, translation('first manual'));
  await save; app.render();
  assert.equal(app.field('manual-translation').props.value, 'newer manual');
  assert.equal(app.output().props.className, 'translation-output unavailable');
});

test('late campaign response cannot mark edited language and brief as saved', async () => {
  const app = studio();
  const pending = app.button('generate-button').props.onClick();
  app.change('language', 'ja');
  app.change('brief', 'new brief');
  app.answer(0, { campaign: campaign('old') });
  await pending; app.render();
  assert.ok(app.node(node => node.props?.className === 'empty-output'));
  assert.equal(app.field('brief').props.value, 'new brief');
});

test('late campaign response cannot replace a reopened stored campaign', async () => {
  const app = studio();
  const first = app.button('generate-button').props.onClick();
  app.answer(0, { campaign: campaign('saved') });
  await first; app.render();
  const pending = app.button('generate-button').props.onClick();
  app.node(node => node.type === 'button' && node.props?.children?.[0]?.props?.children === 'saved').props.onClick();
  app.answer(1, { campaign: campaign('late') });
  await pending; app.render();
  assert.equal(app.node(node => node.props?.className === 'post-content').props.children[1].props.children, 'saved');
});

test('swapping languages invalidates an in-flight translation', async () => {
  const app = studio();
  const pending = app.translate();
  app.button('translation-swap').props.onClick();
  app.answer(0, translation('old response'));
  await pending; app.render();
  assert.equal(app.output().props.className, 'translation-output idle');
  assert.equal(app.field('target-language').props.value, 'th');
});

test('old manual-save failure and finally cannot replace a newer save or clear its pending flag', async () => {
  const app = studio();
  const lookup = app.translate();
  app.answer(0, { message: 'unavailable' }, false);
  await lookup; app.render();
  app.change('manual-translation', 'first');
  const first = app.save();
  app.change('manual-translation', 'second');
  const second = app.save();
  app.requests[1].reject(new Error('old save failed'));
  await first; app.render();
  const saveButton = app.node(node => node.type === 'button' && node.props?.onClick?.name === 'saveManualTranslation');
  assert.equal(saveButton.props.disabled, true);
  assert.equal(app.field('manual-translation').props.value, 'second');
  app.answer(2, translation('second'));
  await second; app.render();
  assert.equal(app.output().props.children.props.children, 'second');
  assert.equal(app.output().props.className, 'translation-output memory');
});

test('campaign failure after editing does not report an error for the new draft', async () => {
  const app = studio();
  const pending = app.button('generate-button').props.onClick();
  app.change('tone', 'มืออาชีพและกระชับ');
  app.requests[0].reject(new Error('old failure'));
  await pending; app.render();
  assert.equal(app.node(node => node.props?.role === 'alert'), undefined);
  assert.equal(app.button('generate-button').props.disabled, false);
});

test('older campaign completion does not clear the pending state of a newer generation', async () => {
  const app = studio();
  const first = app.button('generate-button').props.onClick();
  app.change('brief', 'second');
  const second = app.button('generate-button').props.onClick();
  app.answer(0, { campaign: campaign('first') });
  await first; app.render();
  assert.equal(app.button('generate-button').props.disabled, true);
  app.answer(1, { campaign: campaign('second') });
  await second; app.render();
  assert.equal(app.button('generate-button').props.disabled, false);
  assert.equal(app.node(node => node.props?.className === 'post-content').props.children[1].props.children, 'second');
});

test('changing channels invalidates pending generation without stripping canonical associations', async () => {
  const app = studio();
  const canonical = { concept_id: 'MSU-GOV-ROLE-HUMILITY-001', source_concept_version: '0.1.0' };
  const saved = campaign('canonical');
  saved.posts[0].canonical = canonical;
  const initial = app.button('generate-button').props.onClick();
  app.answer(0, { campaign: saved });
  await initial; app.render();
  const pending = app.button('generate-button').props.onClick();
  assert.deepEqual(app.requests[1].payload.canonical, canonical);
  const picker = app.node(node => node.props?.className === 'channel-picker');
  picker.props.children[0].props.onClick();
  app.answer(1, { campaign: saved });
  await pending; app.render();
  assert.ok(app.node(node => node.props?.className === 'empty-output'));
});

// Loads one saved post with the given fields into the rendered Studio.
async function studioWith(fields) {
  const app = studio();
  const saved = campaign('queue');
  Object.assign(saved.posts[0], fields);
  const generated = app.button('generate-button').props.onClick();
  app.answer(0, { campaign: saved });
  await generated; app.render();
  return { app, post: saved.posts[0] };
}
const approvedStudio = () => studioWith({ status: 'approved' });
const labelled = (...labels) => app => app.node(node => node.type === 'button' && labels.includes(node.props?.children));
const scheduleButton = labelled('ตั้งเวลาโพสต์', 'กำลังตั้งเวลา...');
const repairButton = labelled('เพิ่มเข้าคิวภายในตามเวลาเดิม', 'กำลังเพิ่มเข้าคิว...');
const alertText = app => app.node(node => node.props?.role === 'alert')?.props.children;
function texts(node, out = []) {
  if (typeof node === 'string') out.push(node);
  else if (Array.isArray(node)) node.forEach(child => texts(child, out));
  else if (node && typeof node === 'object') texts(node.props?.children, out);
  return out;
}
const notes = app => {
  const found = [];
  (function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    if (node.props?.role === 'note') found.push(texts(node.props.children).join(''));
    walk(node.props?.children);
  })(app.node(() => true));
  return found;
};
const pageText = app => texts(app.node(() => true)).join('');
const pause = () => new Promise(resolve => setTimeout(resolve, 5));
const scheduledReply = (post, scheduledAt, extra = {}) => ({ job: { id: 'job-1', status: 'blocked_auth' }, post: { ...post, status: 'scheduled', scheduledAt }, ...extra });

test('scheduling makes one publish-queue request and shows scheduled only after the server confirms', async () => {
  const { app, post } = await approvedStudio();
  const pending = scheduleButton(app).props.onClick();
  app.render();
  assert.equal(scheduleButton(app).props.disabled, true);
  assert.equal(scheduleButton(app).props.children, 'กำลังตั้งเวลา...');
  assert.equal(app.button('scheduled'), undefined);
  assert.equal(app.requests.length, 2);
  assert.equal(app.requests[1].url, '/api/publish-jobs');
  assert.deepEqual(Object.keys(app.requests[1].payload).sort(), ['channel', 'postId', 'scheduledAt']);
  assert.equal(app.requests[1].payload.postId, post.id);
  assert.equal(app.requests[1].payload.channel, post.channel);
  app.answer(1, scheduledReply(post, app.requests[1].payload.scheduledAt));
  await pending; app.render();
  assert.ok(app.button('scheduled'));
  assert.equal(alertText(app), 'บันทึกเวลาแล้ว แต่ยังรอเชื่อมบัญชีจริงใน Connection Center ก่อนส่งเผยแพร่');
  assert.equal(app.requests.length, 2, 'no separate post PATCH can diverge from the queue');
});

test('a rejected schedule leaves the post approved and reports the server reason', async () => {
  const { app } = await approvedStudio();
  const pending = scheduleButton(app).props.onClick();
  app.answer(1, { error: 'channel must match the saved post' }, false);
  await pending; app.render();
  assert.equal(app.button('scheduled'), undefined);
  assert.equal(scheduleButton(app).props.disabled, false);
  assert.equal(alertText(app), 'ตั้งเวลาโพสต์ไม่สำเร็จ · channel must match the saved post');
});

test('a retry after an unconfirmed result reuses the schedule so the queue replays it', async () => {
  const { app, post } = await approvedStudio();
  const first = scheduleButton(app).props.onClick();
  app.requests[1].reject(new Error('offline'));
  await first; app.render();
  assert.equal(app.button('scheduled'), undefined);
  assert.equal(alertText(app), 'ยังยืนยันผลการตั้งเวลาไม่ได้ กรุณาลองอีกครั้ง ระบบจะไม่สร้างงานซ้ำ');
  const retry = scheduleButton(app).props.onClick();
  assert.equal(app.requests[2].payload.scheduledAt, app.requests[1].payload.scheduledAt);
  app.answer(2, scheduledReply(post, app.requests[2].payload.scheduledAt, { replayed: true }));
  await retry; app.render();
  assert.ok(app.button('scheduled'));
});

test('an uncertain 5xx keeps the schedule time, so a job that committed is replayed instead of conflicting', async () => {
  for (const [status, body] of [[500, { error: 'Unexpected error' }], [503, null]]) {
    const { app, post } = await approvedStudio();
    const first = scheduleButton(app).props.onClick();
    app.answer(1, body, false, status);
    await first; app.render();
    assert.equal(app.button('scheduled'), undefined, `${status} must not mark the post scheduled`);
    assert.equal(scheduleButton(app).props.disabled, false);
    assert.equal(alertText(app), 'ยังยืนยันผลการตั้งเวลาไม่ได้ กรุณาลองอีกครั้ง ระบบจะไม่สร้างงานซ้ำ');
    await pause(); // a freshly computed time would now differ
    const retry = scheduleButton(app).props.onClick();
    assert.equal(app.requests[2].payload.scheduledAt, app.requests[1].payload.scheduledAt, `${status} retry`);
    app.answer(2, scheduledReply(post, app.requests[2].payload.scheduledAt, { replayed: true }));
    await retry; app.render();
    assert.ok(app.button('scheduled'));
  }
});

test('a definitive no-write rejection ends the attempt, so the next schedule picks a fresh time', async () => {
  const { app, post } = await approvedStudio();
  const first = scheduleButton(app).props.onClick();
  app.answer(1, { error: 'Smart Publisher is not included in the active workspace solution', code: 'MODULE_NOT_ENTITLED' }, false, 403);
  await first; app.render();
  assert.equal(alertText(app), 'ตั้งเวลาโพสต์ไม่สำเร็จ · Smart Publisher is not included in the active workspace solution');
  await pause();
  const next = scheduleButton(app).props.onClick();
  assert.notEqual(app.requests[2].payload.scheduledAt, app.requests[1].payload.scheduledAt);
  app.answer(2, scheduledReply(post, app.requests[2].payload.scheduledAt));
  await next; app.render();
  assert.ok(app.button('scheduled'));
});

test('a legacy scheduled post without a queue job offers an internal-queue repair at its stored time', async () => {
  const storedAt = '2026-10-01T00:00:00Z';
  const { app, post } = await studioWith({ status: 'scheduled', scheduledAt: storedAt, publishJob: null });
  assert.equal(app.button('scheduled'), undefined, 'an unqueued post is not shown as scheduled in the queue');
  assert.deepEqual(notes(app), ['ตั้งเวลาไว้แล้ว แต่ยังไม่มีงานในคิวภายใน · ยังไม่ได้ส่งโพสต์ออกภายนอก']);
  const pending = repairButton(app).props.onClick();
  app.render();
  assert.equal(repairButton(app).props.disabled, true);
  assert.equal(repairButton(app).props.children, 'กำลังเพิ่มเข้าคิว...');
  assert.equal(app.requests[1].url, '/api/publish-jobs');
  assert.deepEqual(app.requests[1].payload, { postId: post.id, channel: post.channel, scheduledAt: storedAt });
  app.answer(1, scheduledReply(post, storedAt));
  await pending; app.render();
  assert.ok(app.button('scheduled'));
  assert.equal(repairButton(app), undefined);
  assert.deepEqual(notes(app), []);
  assert.equal(alertText(app), 'บันทึกเวลาแล้ว แต่ยังรอเชื่อมบัญชีจริงใน Connection Center ก่อนส่งเผยแพร่');
  assert.doesNotMatch(pageText(app), /เผยแพร่แล้ว/, 'queueing never claims external publication');
});

test('the legacy repair keeps the stored time across uncertain retries and reports a definitive conflict', async () => {
  const storedAt = '2026-10-01T00:00:00Z';
  const { app, post } = await studioWith({ status: 'scheduled', scheduledAt: storedAt, publishJob: null });
  const first = repairButton(app).props.onClick();
  app.answer(1, { error: 'Unexpected error' }, false, 500);
  await first; app.render();
  assert.ok(repairButton(app), 'the repair stays available after an uncertain reply');
  const retry = repairButton(app).props.onClick();
  assert.equal(app.requests[2].payload.scheduledAt, storedAt);
  app.answer(2, { error: 'post already has a publish job for a different channel or schedule; re-timing queued posts is not available yet', code: 'PUBLISH_JOB_EXISTS', post: { ...post, scheduledAt: storedAt }, job: { id: 'other', status: 'blocked_auth' } }, false, 409);
  await retry; app.render();
  assert.ok(app.button('scheduled'), 'the server reports a queue job, so the repair is no longer offered');
  assert.equal(repairButton(app), undefined);
  assert.match(alertText(app), /^ตั้งเวลาโพสต์ไม่สำเร็จ · post already has a publish job/);
});

test('a legacy scheduled post without a stored time offers a return to approved instead of a schedule claim', async () => {
  const { app, post } = await studioWith({ status: 'scheduled', scheduledAt: null, publishJob: null });
  assert.equal(app.button('scheduled'), undefined);
  assert.equal(repairButton(app), undefined, 'there is no stored time to queue');
  assert.deepEqual(notes(app), ['สถานะตั้งเวลา แต่ไม่มีเวลาที่บันทึกไว้และไม่มีงานในคิวภายใน · ยังไม่ได้ส่งโพสต์ออกภายนอก']);
  const pending = labelled('กลับเป็นอนุมัติเพื่อตั้งเวลาใหม่')(app).props.onClick();
  assert.equal(app.requests[1].url, `/api/posts/${post.id}`);
  assert.deepEqual(app.requests[1].payload, { status: 'approved' });
  app.answer(1, { post: { ...post, status: 'approved', scheduledAt: null } });
  await pending; app.render();
  assert.equal(scheduleButton(app).props.disabled, false);
  assert.deepEqual(notes(app), []);
});

test('scheduled posts with a queue job, or with unknown queue state, keep the existing scheduled label', async () => {
  for (const publishJob of [{ id: 'job-1', status: 'blocked_auth' }, undefined]) {
    const { app } = await studioWith({ status: 'scheduled', scheduledAt: '2026-10-01T00:00:00Z', publishJob });
    assert.equal(app.button('scheduled').props.disabled, true);
    assert.equal(repairButton(app), undefined);
    assert.deepEqual(notes(app), []);
  }
});

test('canonical legacy posts keep repair actions disabled while trusted review is unavailable', async () => {
  const canonical = { concept_id: 'MSU-GOV-ROLE-HUMILITY-001', source_concept_version: '0.1.0' };
  for (const scheduledAt of ['2026-10-01T00:00:00Z', null]) {
    const { app } = await studioWith({ status: 'scheduled', scheduledAt, publishJob: null, canonical });
    const action = scheduledAt ? repairButton(app) : labelled('กลับเป็นอนุมัติเพื่อตั้งเวลาใหม่')(app);
    assert.equal(action.props.disabled, true);
  }
});

const cancelButton = labelled('ยกเลิกงานในคิวภายใน', 'กำลังยกเลิกงานในคิว...');
const queuedStudio = (status = 'blocked_auth') => studioWith({ status: 'scheduled', scheduledAt: '2026-10-21T00:00:00.000Z', publishJob: { id: 'job-1', status } });
const cancelledReply = post => ({ cancelled: true, job: { id: 'job-1', status: 'cancelled', postId: null, attempts: 0 }, post: { ...post, status: 'approved', scheduledAt: null, publishJob: null } });

test('cancelling an internal queue job returns the post to approved only after the server confirms', async () => {
  for (const status of ['blocked_auth', 'queued']) {
    const { app, post } = await queuedStudio(status);
    assert.equal(app.button('scheduled').props.disabled, true, 'the existing scheduled label stays');
    const pending = cancelButton(app).props.onClick();
    app.render();
    assert.equal(cancelButton(app).props.disabled, true);
    assert.equal(cancelButton(app).props.children, 'กำลังยกเลิกงานในคิว...');
    assert.equal(app.requests[1].url, '/api/publish-jobs/job-1/cancel');
    assert.deepEqual(app.requests[1].payload, { postId: post.id });
    assert.ok(app.button('scheduled'), 'still scheduled until confirmed');
    app.answer(1, cancelledReply(post));
    await pending; app.render();
    assert.equal(app.button('scheduled'), undefined);
    assert.equal(cancelButton(app), undefined);
    assert.equal(scheduleButton(app).props.disabled, false, 'the post can be scheduled again');
    assert.equal(alertText(app), 'ยกเลิกงานในคิวภายในแล้ว · โพสต์กลับเป็นอนุมัติและไม่เคยถูกส่งออกภายนอก');
    assert.doesNotMatch(pageText(app), /เผยแพร่แล้ว/);
  }
});

test('an in-flight job has no internal queue cancel action', async () => {
  const { app } = await queuedStudio('publishing');
  assert.ok(app.button('scheduled'));
  assert.equal(cancelButton(app), undefined);
});

test('a cancel the queue refuses keeps the post scheduled and reports the server reason', async () => {
  const { app, post } = await queuedStudio('queued');
  const pending = cancelButton(app).props.onClick();
  app.answer(1, { error: 'only an internal queue job of this post that has not started an external publish attempt can be cancelled', code: 'JOB_NOT_CANCELLABLE', job: { id: 'job-1', status: 'publishing', postId: post.id, attempts: 1 }, post }, false, 409);
  await pending; app.render();
  assert.ok(app.button('scheduled'));
  assert.equal(alertText(app), 'ยกเลิกงานในคิวไม่สำเร็จ · only an internal queue job of this post that has not started an external publish attempt can be cancelled');
});

test('an uncertain cancel reply changes nothing and the retry asks the same job again', async () => {
  const { app, post } = await queuedStudio();
  const first = cancelButton(app).props.onClick();
  app.answer(1, { error: 'Unexpected error' }, false, 500);
  await first; app.render();
  assert.ok(app.button('scheduled'));
  assert.equal(alertText(app), 'ยังยืนยันผลการยกเลิกไม่ได้ กรุณาลองอีกครั้ง ระบบจะไม่ยกเลิกซ้ำ');
  const retry = cancelButton(app).props.onClick();
  assert.equal(app.requests[2].url, '/api/publish-jobs/job-1/cancel');
  app.answer(2, { ...cancelledReply(post), replayed: true });
  await retry; app.render();
  assert.equal(app.button('scheduled'), undefined);
});

test('jobs outside the internal queue and unknown queue state never offer a cancel', async () => {
  for (const status of ['published', 'failed', 'cancelled']) {
    const { app } = await queuedStudio(status);
    assert.equal(cancelButton(app), undefined, status);
  }
  const unknown = await studioWith({ status: 'scheduled', scheduledAt: '2026-10-21T00:00:00.000Z', publishJob: undefined });
  assert.equal(cancelButton(unknown.app), undefined);
});

test('a replayed old cancel keeps the rescheduled post and its new job instead of hiding it', async () => {
  const { app, post } = await queuedStudio();
  const pending = cancelButton(app).props.onClick();
  app.answer(1, {
    cancelled: true, replayed: true,
    job: { id: 'job-1', status: 'cancelled', postId: null, attempts: 0 },
    post: { ...post, status: 'scheduled', scheduledAt: '2026-10-22T00:00:00.000Z', publishJob: { id: 'job-2', status: 'blocked_auth' } },
  });
  await pending; app.render();
  assert.ok(app.button('scheduled'), 'the new schedule stays visible');
  assert.deepEqual(notes(app), [], 'not shown as a schedule without a queue job');
  assert.equal(repairButton(app), undefined);
  assert.equal(scheduleButton(app), undefined);
  assert.equal(alertText(app), 'งานเดิมถูกยกเลิกไปแล้ว · งานใหม่ของโพสต์นี้ยังอยู่ในคิวภายใน');
  const next = cancelButton(app).props.onClick();
  assert.equal(app.requests[2].url, '/api/publish-jobs/job-2/cancel', 'a later cancel targets the new job');
  app.answer(2, { cancelled: true, job: { id: 'job-2', status: 'cancelled', postId: null, attempts: 0 }, post: { ...post, status: 'approved', scheduledAt: null, publishJob: null } });
  await next; app.render();
  assert.equal(scheduleButton(app).props.disabled, false);
});

test('a refused cancel takes the post queue state from the server, not from the requested job', async () => {
  const { app, post } = await queuedStudio();
  const pending = cancelButton(app).props.onClick();
  app.answer(1, {
    error: 'only an internal queue job of this post that has not started an external publish attempt can be cancelled', code: 'JOB_NOT_CANCELLABLE',
    job: { id: 'job-1', status: 'failed', postId: null, attempts: 0 },
    post: { ...post, status: 'scheduled', publishJob: { id: 'job-0', status: 'blocked_auth' } },
  }, false, 409);
  await pending; app.render();
  assert.ok(app.button('scheduled'));
  assert.deepEqual(notes(app), [], 'the post still has a linked job');
  assert.match(alertText(app), /^ยกเลิกงานในคิวไม่สำเร็จ · /);
  const next = cancelButton(app).props.onClick();
  assert.equal(app.requests[2].url, '/api/publish-jobs/job-0/cancel');
  app.answer(2, { error: 'x', code: 'JOB_NOT_CANCELLABLE', job: null, post: { ...post, publishJob: { id: 'job-0', status: 'blocked_auth' } } }, false, 409);
  await next;
});

test('a replayed cancel for a post that moved on does not claim it returned to approved', async () => {
  const { app, post } = await queuedStudio();
  const pending = cancelButton(app).props.onClick();
  app.answer(1, { cancelled: true, replayed: true, job: { id: 'job-1', status: 'cancelled', postId: null, attempts: 0 }, post: { ...post, status: 'archived', scheduledAt: null, publishJob: null } });
  await pending; app.render();
  assert.equal(alertText(app), 'ยกเลิกงานในคิวภายในแล้ว · งานนี้ไม่เคยถูกส่งออกภายนอก');
  assert.equal(app.button('scheduled'), undefined);
});
