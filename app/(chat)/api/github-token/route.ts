// GET /api/github-token
// Returns whether a server-side GitHub PAT is configured, and its value so the
// browser-side GitHub integration can use it when no token is stored locally.
// The token is already browser-accessible when set via the Settings page, so
// returning it here for the server-.env path is consistent with that model.

export async function GET() {
  const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN ?? null;
  return Response.json({ token });
}
