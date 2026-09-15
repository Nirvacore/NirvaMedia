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
    answer(index, data, ok = true) { requests[index].resolve({ ok, json: async () => data }); },
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
