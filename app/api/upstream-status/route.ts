import inventory from "../../../docs/upstream-source-inventory.json";

export async function GET() {
  return Response.json(inventory);
}
