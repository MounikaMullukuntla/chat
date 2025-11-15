import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { createAuthErrorResponse, requireAdmin } from "@/lib/auth/server";
import { setModelAsDefault } from "@/lib/db/queries/model-config";
import { ChatSDKError } from "@/lib/errors";
import {
  ErrorCategory,
  ErrorSeverity,
  logAdminError,
  logApiError,
} from "@/lib/errors/logger";
import {
  logUserActivity,
  createCorrelationId,
  UserActivityType,
  ActivityCategory,
} from "@/lib/logging";

// POST /api/admin/models/[modelId]/set-default - Set a model as default for its provider
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
) {
  const correlationId = createCorrelationId();
  let user: User;

  try {
    const authResult = await requireAdmin();
    user = authResult.user;
  } catch (error) {
    await logApiError(
      ErrorCategory.UNAUTHORIZED_ACCESS,
      `Set default model request authentication failed: ${error instanceof Error ? error.message : "Unknown auth error"}`,
      { request: { method: "POST", url: request.url } },
      ErrorSeverity.WARNING
    );
    return createAuthErrorResponse(error as Error);
  }

  const { modelId } = await params;

  try {
    const updatedModel = await setModelAsDefault(modelId);

    // Log successful admin config update
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: UserActivityType.ADMIN_CONFIG_UPDATE,
      activity_category: ActivityCategory.ADMIN,
      activity_metadata: {
        model_id: modelId,
        action: "set_default_model",
      },
      request_path: request.url,
      request_method: "POST",
      success: true,
    });

    await logAdminError(
      ErrorCategory.CONFIG_UPDATE_FAILED, // Will be changed to success category when available
      `Model set as default: ${modelId}`,
      { action: "set_default_model", modelId },
      user.id,
      ErrorSeverity.INFO
    );

    return Response.json(updatedModel, { status: 200 });
  } catch (error) {
    // Log failed admin config update
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: UserActivityType.ADMIN_CONFIG_UPDATE,
      activity_category: ActivityCategory.ADMIN,
      success: false,
      error_message: error instanceof Error ? error.message : "Unknown error",
    });

    await logAdminError(
      ErrorCategory.CONFIG_UPDATE_FAILED,
      `Failed to set model as default ${modelId}: ${error instanceof Error ? error.message : "Unknown error"}`,
      { modelId },
      user.id,
      ErrorSeverity.ERROR
    );

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError(
      "bad_request:database",
      "Failed to set model as default"
    ).toResponse();
  }
}
