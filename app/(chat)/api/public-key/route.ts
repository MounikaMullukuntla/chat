// GET /api/public-key
// Returns the server's RSA public key as a JWK so the browser can encrypt
// API keys with it (Phase 9 — only the server can decrypt them).
// Returns 404 when BROWSER_ENCRYPTION_PRIVATE_KEY is not configured.

import { getServerPublicKeyJwk } from "@/lib/server-crypto";

export async function GET() {
  const jwk = getServerPublicKeyJwk();
  if (!jwk) {
    return new Response("Server encryption key not configured", { status: 404 });
  }
  return Response.json(jwk);
}
