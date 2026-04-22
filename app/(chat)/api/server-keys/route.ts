// GET /api/server-keys
// Returns the list of provider IDs that have a key in the server's .env file.
// Falls back to [] if the Rust team server is not running.

export const revalidate = 30;

export async function GET() {
  try {
    const res = await fetch("http://localhost:8081/api/config/current", {
      next: { revalidate: 30 },
    });
    if (!res.ok) return Response.json([]);
    const data = await res.json();
    return Response.json(data.env_keys_present ?? []);
  } catch {
    return Response.json([]);
  }
}
