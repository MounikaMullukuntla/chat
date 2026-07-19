import "server-only";
import { NextResponse } from "next/server";
import { isPlaceholderValue } from "@/lib/auth/env-placeholder";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

const SUPABASE_VAR_NAMES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "POSTGRES_URL",
] as const;

function isLocalRequest(request: Request): boolean {
  if (process.env.VERCEL) return false;
  const host = request.headers.get("host") ?? "";
  const hostname = host.split(":")[0];
  return LOCAL_HOSTNAMES.has(hostname);
}

export async function GET(request: Request) {
  if (!isLocalRequest(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const values = SUPABASE_VAR_NAMES
    .map((name) => {
      const value = process.env[name] ?? "";
      return { name, value, isPlaceholder: isPlaceholderValue(name, value) };
    })
    .filter((entry) => entry.value.length > 0);

  return NextResponse.json({ values });
}
