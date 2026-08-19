import registry from "../../../docs/source-provenance-registry.json";

export async function GET() {
  return Response.json(registry);
}
