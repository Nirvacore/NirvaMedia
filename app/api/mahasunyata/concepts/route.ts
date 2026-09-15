import { getConcept, listConcepts, schemaVersion, sourceProvenance } from '../../../../lib/mahasunyata/concept-registry';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get('concept_id');
  const version = params.get('version');
  if ((version !== null && !id) || id === '') {
    return Response.json({ error: 'concept_id is required for version lookup' }, { status: 400 });
  }
  const concept = id ? getConcept(id, version ?? undefined) : undefined;
  if (id && !concept) return Response.json({ error: 'Canonical concept or version not found' }, { status: 404 });
  return Response.json({
    schema_version: schemaVersion,
    source: sourceProvenance,
    concepts: concept ? [concept] : listConcepts(),
  });
}
