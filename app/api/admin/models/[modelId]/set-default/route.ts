import { NextRequest } from "next/server";
import { requireAdmin, createAuthErrorResponse } from "@/lib/auth/server";
import { setModelAsDefault } from "@/lib/db/queries/model-config";
import { ChatSDKError } from "@/lib/errors";
import { logApiError, logAdminError, ErrorCategory, ErrorSeverity } from "@/lib/errors/logger";

// POST /api/admin/models/[modelId]/set-default - Set a model as default for its provider
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
) {
  let user;
  
  try {
    const authResult = await requireAdmin();
    user = authResult.user;
  } catch (error) {
    await logApiError(
      ErrorCategory.UNAUTHORIZED_ACCESS,
      `Set default model request authentication failed: ${error instanceof Error ? error.message : 'Unknown auth error'}`,
      { request: { method: 'POST', url: request.url } },
      ErrorSeverity.WARNING
    );
    return createAuthErrorResponse(error as Error);
  }

  const { modelId } = await params;

  try {
    const updatedModel = await setModelAsDefault(modelId);

    await logAdminError(
      ErrorCategory.CONFIG_UPDATE_FAILED, // Will be changed to success category when available
      `Model set as default: ${modelId}`,
      { action: 'set_default_model', modelId },
      user.id,
      ErrorSeverity.INFO
    );

    return Response.json(updatedModel, { status: 200 });
  } catch (error) {
    await logAdminError(
      ErrorCategory.CONFIG_UPDATE_FAILED,
      `Failed to set model as default ${modelId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { modelId },
      user.id,
      ErrorSeverity.ERROR
    );
    
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError("bad_request:database", "Failed to set model as default").toResponse();
  }
}