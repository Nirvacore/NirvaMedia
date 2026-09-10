import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { mediaRuntime } from './helpers/media-runtime.mjs';
const runtime = mediaRuntime();
after(() => runtime.close());
const { canonicalForRegeneration } = runtime.route('lib/mahasunyata/studio.ts');
const canonical = { concept_id: 'MSU-GOV-ROLE-HUMILITY-001', source_concept_version: '0.1.0' };
test('regeneration keeps the original concept and exact version across channels', () => {
  assert.deepEqual(canonicalForRegeneration([{ canonical: { ...canonical, locale: 'th' } }, { canonical: { ...canonical, locale: 'en' } }]), canonical);
});
test('generic campaigns stay generic', () => {
  assert.equal(canonicalForRegeneration([]), undefined);
  assert.equal(canonicalForRegeneration([{ canonical: null }]), undefined);
});
test('ambiguous concept associations fail closed instead of silently stripping meaning', () => {
  assert.throws(() => canonicalForRegeneration([{ canonical }, { canonical: { ...canonical, source_concept_version: '0.2.0' } }]));
  assert.throws(() => canonicalForRegeneration([{ canonical }, { canonical: null }]));
});
