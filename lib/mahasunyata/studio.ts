// Client-side association handling only; canonical validation remains server-owned.
export type StudioCanonical = {
  concept_id: string;
  source_concept_version: string;
};

export function canonicalForRegeneration(posts: { canonical?: StudioCanonical | null }[]): StudioCanonical | undefined {
  const associated = posts.filter(post => post.canonical != null);
  if (associated.length === 0) return undefined;
  const source = associated[0].canonical!;
  if (associated.length !== posts.length || associated.some(post =>
    post.canonical!.concept_id !== source.concept_id ||
    post.canonical!.source_concept_version !== source.source_concept_version)) {
    throw new Error('Mixed canonical associations cannot be regenerated together');
  }
  return { concept_id: source.concept_id, source_concept_version: source.source_concept_version };
}
