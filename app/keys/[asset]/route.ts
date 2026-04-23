import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

const ASSET_CONTENT_TYPES = {
  "key-manager.js": "application/javascript; charset=utf-8",
  "providers.js": "application/javascript; charset=utf-8",
  "style.css": "text/css; charset=utf-8",
} as const;

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ asset: string }> }
) {
  const { asset } = await params;
  const contentType =
    ASSET_CONTENT_TYPES[asset as keyof typeof ASSET_CONTENT_TYPES];

  if (!contentType) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const filePath = join(process.cwd(), "keys", asset);
    const body = await readFile(filePath);

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
