import artifact from './vendor/concepts.json';
import schema from './vendor/concepts.schema.json';
import source from './vendor/source-provenance.json';
import type { CanonicalConcept, ConceptRegistry } from './concept-types';

type Schema = {
  $ref?: string; type?: string; required?: string[]; additionalProperties?: boolean;
  properties?: Record<string, Schema>; enum?: string[]; pattern?: string;
  minLength?: number; minItems?: number; items?: Schema; format?: string;
};
function invalid(path: string): never {
  throw new Error(`Invalid canonical concept registry: ${path}`);
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
// Applies every constraint used by the pinned source schema, including nested
// additionalProperties and real calendar dates. No network/schema resolution.
function validate(value: unknown, rule: Schema, path: string): void {
  if (rule.$ref) {
    const name = rule.$ref.replace('#/$defs/', '');
    const definition = (schema.$defs as Record<string, Schema>)[name];
    if (!definition || rule.$ref !== `#/$defs/${name}`) invalid(path);
    return validate(value, definition, path);
  }
  if (rule.type === 'object') {
    if (!object(value)) invalid(path);
    for (const key of rule.required ?? []) if (!(key in value)) invalid(`${path}.${key}`);
    for (const [key, item] of Object.entries(value)) {
      const child = rule.properties?.[key];
      if (child) validate(item, child, `${path}.${key}`);
      else if (rule.additionalProperties === false) invalid(`${path}.${key}`);
    }
  } else if (rule.type === 'array') {
    if (!Array.isArray(value) || value.length < (rule.minItems ?? 0)) invalid(path);
    for (const item of value) if (rule.items) validate(item, rule.items, path);
  } else if (rule.type === 'string') {
    if (typeof value !== 'string' || value.length < (rule.minLength ?? 0)) invalid(path);
    if (rule.enum && !rule.enum.includes(value)) invalid(path);
    if (rule.pattern && !new RegExp(rule.pattern).test(value)) invalid(path);
    if (rule.format === 'date') {
      const parsed = new Date(`${value}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) invalid(path);
    }
  } else invalid(`${path}: unsupported schema type`);
}

export function validateRegistry(value: unknown): asserts value is ConceptRegistry {
  if (!object(value) || value.schema_version !== '0.1.0' || value.source_schema !== 'concepts.schema.json' ||
      Object.keys(value).some(key => !['schema_version', 'source_schema', 'concepts'].includes(key)) ||
      !Array.isArray(value.concepts) || !value.concepts.length) invalid('envelope');
  const ids = new Set<string>();
  for (const record of value.concepts) {
    if (!object(record)) invalid('concept');
    // source_file belongs to the export envelope, not the source concept schema.
    const { source_file, ...concept } = record;
    validate(concept, schema, 'concept');
    if (source_file !== `concepts/${concept.concept_id}.yaml`) invalid('source_file');
    const id = concept.concept_id as string;
    if (ids.has(id)) invalid(`duplicate ${id}`);
    ids.add(id);
  }
}

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
validateRegistry(artifact);
const registry: ConceptRegistry = freeze(artifact);
type DeepReadonly<T> = { readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K] };
export const sourceProvenance: DeepReadonly<typeof source> = freeze(source);
export const schemaVersion = registry.schema_version;
const byId = new Map(registry.concepts.map(concept => [concept.concept_id, concept]));

export function getConcept(conceptId: string, version?: string): CanonicalConcept | undefined {
  const concept = byId.get(conceptId);
  return concept && (version === undefined || concept.version === version) ? concept : undefined;
}
export function listConcepts(): readonly CanonicalConcept[] {
  return registry.concepts;
}
