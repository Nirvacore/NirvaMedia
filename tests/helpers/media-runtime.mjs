import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, readdirSync, symlinkSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';

// Execute actual handlers, Drizzle queries and migrations. Only the Cloudflare
// binding and external translation provider are replaced at their boundaries.
export function mediaRuntime() {
  const root = resolve(import.meta.dirname, '../..');
  const temporary = mkdtempSync(join(tmpdir(), 'nirva-media-runtime-'));
  symlinkSync(join(root, 'node_modules'), join(temporary, 'node_modules'), 'dir');
  const require = createRequire(join(temporary, 'entry.cjs'));
  const compiled = new Set();
  function compile(relative) {
    const destination = join(temporary, relative.replace(/\.ts$/, '.js'));
    if (compiled.has(relative)) return destination;
    compiled.add(relative);
    mkdirSync(dirname(destination), { recursive: true });
    if (relative.endsWith('.json')) {
      writeFileSync(destination, readFileSync(join(root, relative)));
      return destination;
    }
    const result = ts.transpileModule(readFileSync(join(root, relative), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    writeFileSync(destination, result);
    for (const match of result.matchAll(/require\("(\.[^"]+)"\)/g)) {
      const candidate = resolve(dirname(join(root, relative)), match[1]).slice(root.length + 1);
      const dependency = [candidate, `${candidate}.ts`, `${candidate}/index.ts`].find(path => existsSync(join(root, path)) && /\.(ts|json)$/.test(path));
      if (dependency) compile(dependency);
    }
    return destination;
  }
  const sqlite = new DatabaseSync(':memory:');
  for (const migration of readdirSync(join(root, 'drizzle')).filter(name => name.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(join(root, 'drizzle', migration), 'utf8'));
  }
  const binding = {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      let parameters = [];
      return {
        bind(...values) { parameters = values; return this; },
        async raw() { statement.setReturnArrays(true); return statement.all(...parameters); },
        async all() { statement.setReturnArrays(false); return { results: statement.all(...parameters) }; },
        async run() { return { results: [], meta: statement.run(...parameters) }; },
      };
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const results = await Promise.all(statements.map(statement => statement.all())); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  const schema = require(compile('db/schema.ts'));
  const { drizzle } = require('drizzle-orm/d1');
  const db = drizzle(binding, { schema });
  const dbPath = compile('db/index.ts');
  require.cache[require.resolve(dbPath)] = { exports: { getDb: () => db } };
  const provider = {
    result: { status: 'unavailable', providerId: 'test', reason: 'missing_credential' },
    getTranslationProviderStatus: () => ({ status: 'unavailable' }),
    async translateWithProvider() { return provider.result; },
  };
  const providerPath = compile('lib/nle/translation-provider.ts');
  require.cache[require.resolve(providerPath)] = { exports: provider };
  return {
    sqlite, provider,
    route: path => require(compile(path)),
    close() { sqlite.close(); rmSync(temporary, { recursive: true, force: true }); },
  };
}
