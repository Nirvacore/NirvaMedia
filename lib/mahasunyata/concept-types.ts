export type BilingualText = Readonly<{ th: string; en: string }>;
export type BilingualStatements = Readonly<{ th: readonly string[]; en: readonly string[] }>;
export type CanonicalConcept = Readonly<{
  concept_id: string;
  version: string;
  status: 'draft' | 'stable' | 'deprecated';
  canonical: BilingualText;
  meaning: BilingualStatements;
  not_meaning: BilingualStatements;
  safeguards: BilingualStatements;
  provenance: Readonly<{
    source_document: string;
    source_version: string;
    source_section: string;
    steward: string;
    reviewed_on: string;
  }>;
  source_file: string;
}>;
export type ConceptRegistry = Readonly<{
  schema_version: '0.1.0';
  source_schema: 'concepts.schema.json';
  concepts: readonly CanonicalConcept[];
}>;
