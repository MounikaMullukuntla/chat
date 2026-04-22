// GET /api/server-keys
// Returns the list of provider IDs that have a key in the server's .env file.
// SERVER_KEYS_JSON is pre-computed in server.mjs before Next.js boots.

export async function GET() {
  const keys = process.env.SERVER_KEYS_JSON
    ? JSON.parse(process.env.SERVER_KEYS_JSON)
    : [];
  return Response.json(keys);
}
