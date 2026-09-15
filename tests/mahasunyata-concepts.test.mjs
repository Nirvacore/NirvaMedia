import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import test, { after } from 'node:test';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const temporary = mkdtempSync(join(tmpdir(), 'nirva-concepts-'));
after(() => rmSync(temporary, { recursive: true, force: true }));
const require = createRequire(import.meta.url);
function compile(relative) {
  const target = join(temporary, relative.replace(/\.ts$/, '.js'));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, ts.transpileModule(readFileSync(join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText);
  return target;
}
// Compile real runtime modules; never substitute source-text assertions.
compile('lib/mahasunyata/concept-registry.ts');
for (const name of ['concepts.json', 'concepts.schema.json', 'source-provenance.json']) {
  const target = join(temporary, 'lib/mahasunyata/vendor', name);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, readFileSync(join(root, 'lib/mahasunyata/vendor', name)));
}
const registry = require(join(temporary, 'lib/mahasunyata/concept-registry.js'));
const { GET } = require(compile('app/api/mahasunyata/concepts/route.ts'));
const artifact = JSON.parse(readFileSync(join(root, 'lib/mahasunyata/vendor/concepts.json'), 'utf8'));
const id = artifact.concepts[0].concept_id;

test('lookup retains exact canonical content, version and provenance', () => {
  assert.deepEqual(registry.getConcept(id), artifact.concepts[0]);
  assert.equal(registry.getConcept(id, '0.1.0').version, '0.1.0');
  assert.equal(registry.getConcept(id, '9.0.0'), undefined);
  assert.equal(registry.getConcept('unknown'), undefined);
  assert.deepEqual(registry.listConcepts(), artifact.concepts);
});

test('rejects malformed nested records, duplicate IDs and invalid envelopes', () => {
  const mutations = [
    x => x.concepts[0].canonical.th = '',
    x => x.concepts[0].canonical.extra = 'bad',
    x => x.concepts[0].meaning.en = 'bad',
    x => x.concepts[0].not_meaning.th = [],
    x => x.concepts[0].safeguards.en = [4],
    x => delete x.concepts[0].provenance.steward,
    x => x.concepts[0].provenance.reviewed_on = '2026-02-30',
    x => x.concepts[0].status = 'approved',
    x => x.concepts[0].version = 'latest',
    x => x.concepts[0].concept_id = 'invalid',
    x => x.concepts[0].source_file = '../escape.yaml',
    x => x.concepts.push(x.concepts[0]),
    x => x.schema_version = '9.0.0',
    x => x.source_schema = 'other.json',
    x => x.concepts = [],
  ];
  for (const mutate of mutations) {
    const value = structuredClone(artifact); mutate(value);
    assert.throws(() => registry.validateRegistry(value));
  }
});

test('all returned content and source metadata are immutable', () => {
  assert.throws(() => registry.getConcept(id).safeguards.en.push('tampered'));
  assert.throws(() => registry.listConcepts().pop());
  assert.throws(() => registry.sourceProvenance.commit = 'tampered');
  assert.deepEqual(registry.getConcept(id), artifact.concepts[0]);
});

test('pinned artifact and schema hashes match source metadata', () => {
  assert.equal(registry.sourceProvenance.commit, 'cc54c720c2160aec3228d656e4495651a67a5efb');
  assert.equal(registry.sourceProvenance.repository, 'https://github.com/Nirvacore/nirva-docs');
  assert.equal(registry.sourceProvenance.branch, 'codex/mahasunyata-universal-os');
  for (const name of ['concepts.json', 'concepts.schema.json']) {
    const bytes = readFileSync(join(root, 'lib/mahasunyata/vendor', name));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), registry.sourceProvenance.artifacts[name].sha256);
  }
});

test('GET returns canonical envelope and unknown ID/version returns 404', async () => {
  const response = await GET(new Request(`https://example.test/api/mahasunyata/concepts?concept_id=${id}&version=0.1.0`));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.concepts, [artifact.concepts[0]]);
  assert.deepEqual(body.source, registry.sourceProvenance);
  assert.equal(body.schema_version, artifact.schema_version);
  for (const query of ['concept_id=unknown', `concept_id=${id}&version=9.0.0`]) {
    assert.equal((await GET(new Request(`https://example.test/?${query}`))).status, 404);
  }
  assert.equal((await (await GET(new Request('https://example.test/'))).json()).concepts.length, artifact.concepts.length);
  assert.equal((await GET(new Request('https://example.test/?version=0.1.0'))).status, 400);
});
