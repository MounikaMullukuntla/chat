import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/betterauth/auth";

// GET /api/oauth/relay?redirect=<original-page-url>
//
// Better Auth redirects here after a successful OAuth callback (via the
// callbackURL set by /api/oauth/[provider]). At this point the session cookie
// is first-party (the browser just navigated from Better Auth's callback to
// us). We read the session here, encode the user as a URL-safe base64 string,
// and embed it in the hash of the final redirect. The original page reads
// #auth_user=... from the hash — no cross-origin cookie fetch, works in
// Chrome incognito.
export async function GET(request: NextRequest) {
  const redirect = request.nextUrl.searchParams.get("redirect");

  if (!redirect) {
    return new NextResponse("Missing redirect parameter", { status: 400 });
  }

  let destination = redirect;
  try {
    // Use next/headers (same path as server.ts getCurrentUser) rather than
    // request.headers — BetterAuth reads cookies correctly from this source.
    const reqHeaders = await headers();
    console.log("[OAuth relay] cookie header present:", !!reqHeaders.get("cookie"));
    const session = await auth.api.getSession({ headers: reqHeaders });
    console.log("[OAuth relay] session found:", !!session?.user, session?.user?.email);
    if (session?.user) {
      const user = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
      };
      // base64url avoids +, /, = characters so URLSearchParams.get() cannot
      // corrupt the value by treating %2B-decoded "+" as a space character.
      const encoded = Buffer.from(
        encodeURIComponent(JSON.stringify(user))
      ).toString("base64url");

      const dest = new URL(redirect);
      dest.hash = `auth_user=${encoded}`;
      destination = dest.toString();
    }
  } catch (err) {
    console.error("[OAuth relay] session read failed", err);
  }

  // Append relay_debug so we can confirm this relay was reached even if no session.
  // Remove after debugging.
  const finalUrl = new URL(destination);
  if (!finalUrl.hash.includes("auth_user")) {
    finalUrl.searchParams.set("relay_debug", "no_session");
    destination = finalUrl.toString();
  }

  return NextResponse.redirect(destination);
}
