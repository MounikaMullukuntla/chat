import "server-only";
import { NextResponse } from "next/server";
import { corsPreflight, withCors } from "@/lib/cors";
import { loadSheetsConfig } from "@/lib/google/sheets-config";

export const runtime = "nodejs";

// Node's counterpart to team's Rust /api/google/sheets/config (get_sheets_config).
export async function OPTIONS() {
  return corsPreflight();
}

export async function GET() {
  const { config } = loadSheetsConfig();
  return withCors(NextResponse.json({ success: true, config }));
}
