import "server-only";
import { NextResponse } from "next/server";
import { corsPreflight, withCors } from "@/lib/cors";
import { getMemberByEmail } from "@/lib/google/sheets-member";

export const runtime = "nodejs";

// Node's counterpart to team's Rust /api/google/sheets/member/{email}
// (get_member_by_email) — unlike Rust's stub, this actually reads the sheet.
export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(_request: Request, { params }: { params: Promise<{ email: string }> }) {
  const { email } = await params;
  const result = await getMemberByEmail(decodeURIComponent(email));

  switch (result.status) {
    case "not_configured":
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: "Google Sheets not configured. Please update spreadsheetId in config.yaml",
            email,
          },
          { status: 400 }
        )
      );
    case "no_credentials":
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: "GOOGLE_SERVICE_KEY / GOOGLE_SERVICE_KEY_JSON not set or invalid in docker/.env",
            email,
          },
          { status: 400 }
        )
      );
    case "not_found":
      return withCors(NextResponse.json({ success: true, data: null, email }));
    case "found":
      return withCors(NextResponse.json({ success: true, data: result.data, email }));
    default:
      return withCors(NextResponse.json({ success: false, error: "Unknown error", email }, { status: 500 }));
  }
}
