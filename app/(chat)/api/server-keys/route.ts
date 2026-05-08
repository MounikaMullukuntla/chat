// GET /api/server-keys
// Returns the list of provider IDs that have a real key in the server environment.
// SERVER_KEYS_JSON is pre-computed in server.mjs before Next.js boots (local/webroot).
// On Vercel (no server.mjs), falls back to reading env vars directly.

const PROVIDER_ENV_VARS: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  google:    "GEMINI_API_KEY",
  openai:    "OPENAI_API_KEY",
  xai:       "XAI_API_KEY",
  groq:      "GROQ_API_KEY",
  github:    "GITHUB_PERSONAL_ACCESS_TOKEN",
  pinecone:  "PINECONE_API_KEY",
  voyage:    "VOYAGE_API_KEY",
};

const PLACEHOLDER = /^(your_|sk-your|<|example|placeholder|xxx|changeme|todo|test|dummy)/i;
function isRealKey(val: string | undefined): boolean {
  return !!val && val.trim().length > 0 && !PLACEHOLDER.test(val.trim()) && !val.includes("_here");
}

export async function GET() {
  if (process.env.SERVER_KEYS_JSON) {
    return Response.json(JSON.parse(process.env.SERVER_KEYS_JSON));
  }

  const keys = Object.entries(PROVIDER_ENV_VARS)
    .filter(([, envVar]) => isRealKey(process.env[envVar]))
    .map(([id]) => id);

  return Response.json(keys);
}
