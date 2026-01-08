import type { User } from "@supabase/supabase-js";
import { createAuthErrorResponse, requireAuth } from "@/lib/auth/server";
import { getAdminConfigSummary } from "@/lib/db/queries/admin";
import { ChatSDKError } from "@/lib/errors";
import { ErrorCategory, ErrorSeverity, logApiError } from "@/lib/errors/logger";

// GET /api/models/capabilities - Public model capabilities for authenticated users
export async function GET(request: Request) {
  let user: User;

  try {
    const authResult = await requireAuth();
    user = authResult.user;
  } catch (error) {
    await logApiError(
      ErrorCategory.UNAUTHORIZED_ACCESS,
      `Model capabilities GET request authentication failed: ${error instanceof Error ? error.message : "Unknown auth error"}`,
      {
        request: {
          method: "GET",
          url: request.url,
          headers: Object.fromEntries(request.headers.entries()),
        },
      },
      ErrorSeverity.WARNING
    );

    return createAuthErrorResponse(error as Error);
  }

  try {
    const capabilities = await getAdminConfigSummary();

    return Response.json(
      { capabilities },
      {
        status: 200,
        headers: {
          "X-API-Version": "1.0",
        },
      }
    );
  } catch (error) {
    await logApiError(
      ErrorCategory.DATABASE_ERROR,
      `Failed to retrieve model capabilities: ${error instanceof Error ? error.message : "Unknown database error"}`,
      {
        request: {
          method: "GET",
          url: request.url,
        },
        user,
      },
      ErrorSeverity.ERROR
    );

    return new ChatSDKError(
      "bad_request:database",
      "Failed to retrieve model capabilities"
    ).toResponse();
  }
}
