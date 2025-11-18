import type { User } from "@supabase/supabase-js";
import { createAuthErrorResponse, requireAdmin } from "@/lib/auth/server";
import { purgeOldActivityLogs } from "@/lib/db/queries/admin";
import { ChatSDKError } from "@/lib/errors";
import {
  ErrorCategory,
  ErrorSeverity,
  logAdminError,
  logApiError,
} from "@/lib/errors/logger";

export async function POST(request: Request) {
  // Authenticate and authorize admin user
  let user: User;
  try {
    const authResult = await requireAdmin();
    user = authResult.user;
  } catch (error) {
    await logApiError(
      ErrorCategory.UNAUTHORIZED_ACCESS,
      `Admin logging purge POST request authentication failed: ${error instanceof Error ? error.message : "Unknown auth error"}`,
      {
        request: {
          method: "POST",
          url: request.url,
          headers: Object.fromEntries(request.headers.entries()),
        },
      },
      ErrorSeverity.WARNING
    );

    return createAuthErrorResponse(error as Error);
  }

  try {
    const result = await purgeOldActivityLogs();

    // Log successful admin action
    await logAdminError(
      ErrorCategory.CONFIG_UPDATE_FAILED, // This will be changed to success category when available
      "Activity logs purged successfully by admin",
      {
        action: "purge_logs",
        result,
      },
      user.id,
      ErrorSeverity.INFO
    );

    return Response.json(result, { status: 200 });
  } catch (error) {
    await logAdminError(
      ErrorCategory.DATABASE_ERROR,
      `Failed to purge activity logs: ${error instanceof Error ? error.message : "Unknown database error"}`,
      {},
      user.id,
      ErrorSeverity.ERROR
    );

    return new ChatSDKError("bad_request:database").toResponse();
  }
}
