import "server-only";
import { NextResponse } from "next/server";
import { getDbStatus } from "@/lib/auth/db-status";

// Booleans-equivalent status only — safe to expose publicly, no gating
// needed (unlike local-env-values, this never carries a secret value).
export async function GET() {
  const status = await getDbStatus();
  return NextResponse.json({ status });
}
