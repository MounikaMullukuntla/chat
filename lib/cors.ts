import "server-only";
import { NextResponse } from "next/server";

// Permissive CORS for the Google Sheets member-form endpoints only. These are
// called cross-origin from team/admin/google/form/ (a static page that may be
// served by a different local dev server than chat's own port). They never
// return secrets (service account keys, OAuth client secret) — only a client
// ID, config status flags, and sheet rows the user's own Google sign-in
// already authorized editing.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export function withCors<T extends Response>(response: T): T {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export function corsPreflight(): Response {
  return withCors(new Response(null, { status: 204 }));
}

// A thrown error (e.g. a rejected Google Sheets API call) reaches Next.js's
// default error handling before any of our route code runs, which produces a
// response with no CORS headers — the browser reports that as an opaque CORS
// failure rather than surfacing the real error. Route handlers that call out
// to Google should wrap their body in try/catch and return this on failure.
export function corsErrorJson(
  status: number,
  body: Record<string, unknown>
): NextResponse {
  return withCors(NextResponse.json(body, { status }));
}
