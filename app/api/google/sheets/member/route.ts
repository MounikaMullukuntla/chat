import "server-only";
import { NextResponse } from "next/server";
import { corsPreflight, withCors } from "@/lib/cors";
import { saveMemberData } from "@/lib/google/sheets-member";

export const runtime = "nodejs";

// Node's counterpart to team's Rust /api/google/sheets/member (save_member_data)
// — unlike Rust's stub, this actually appends/updates a row in the sheet.
export async function OPTIONS() {
  return corsPreflight();
}

type SaveMemberRequestBody = {
  data?: Record<string, string>;
  email?: string;
  updateExisting?: boolean;
};

async function handleSave(request: Request) {
  const body = (await request.json()) as SaveMemberRequestBody;
  const { data, email, updateExisting } = body;

  if (!email) {
    return withCors(NextResponse.json({ success: false, error: "email is required" }, { status: 400 }));
  }

  const result = await saveMemberData(data ?? {}, email, !!updateExisting);

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
    case "saved":
      return withCors(NextResponse.json({ success: true, data: result.data, updated: result.updated }));
    default:
      return withCors(NextResponse.json({ success: false, error: "Unknown error", email }, { status: 500 }));
  }
}

export async function POST(request: Request) {
  return handleSave(request);
}

export async function PUT(request: Request) {
  return handleSave(request);
}
