import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createAuthErrorResponse, requireAdmin } from "@/lib/auth/server";
import {
  deleteModel,
  getModelByModelId,
  updateModel,
} from "@/lib/db/queries/model-config";
import { ChatSDKError } from "@/lib/errors";
import {
  ErrorCategory,
  ErrorSeverity,
  logAdminError,
  logApiError,
} from "@/lib/errors/logger";

// Validation schema for model updates
const UpdateModelSchema = z.object({
  name: z.string().min(1, "Model name is required").optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  thinkingEnabled: z.boolean().optional(),
  inputPricingPerMillionTokens: z.string().optional(),
  outputPricingPerMillionTokens: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// GET /api/admin/models/[modelId] - Get a specific model
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
) {
  let user: User;

  try {
    const authResult = await requireAdmin();
    user = authResult.user;
  } catch (error) {
    await logApiError(
      ErrorCategory.UNAUTHORIZED_ACCESS,
      `Model GET request authentication failed: ${error instanceof Error ? error.message : "Unknown auth error"}`,
      { request: { method: "GET", url: request.url } },
      ErrorSeverity.WARNING
    );
    return createAuthErrorResponse(error as Error);
  }

  const { modelId } = await params;

  try {
    const model = await getModelByModelId(modelId);

    if (!model) {
      return new ChatSDKError(
        "not_found:api",
        `Model ${modelId} not found`
      ).toResponse();
    }

    return Response.json(model, { status: 200 });
  } catch (error) {
    await logApiError(
      ErrorCategory.DATABASE_ERROR,
      `Failed to retrieve model ${modelId}: ${error instanceof Error ? error.message : "Unknown error"}`,
      { request: { method: "GET", url: request.url }, user },
      ErrorSeverity.ERROR
    );
    return new ChatSDKError(
      "bad_request:database",
      "Failed to retrieve model"
    ).toResponse();
  }
}

// PATCH /api/admin/models/[modelId] - Update a model
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
) {
  let user: User;

  try {
    const authResult = await requireAdmin();
    user = authResult.user;
  } catch (error) {
    await logApiError(
      ErrorCategory.UNAUTHORIZED_ACCESS,
      `Model PATCH request authentication failed: ${error instanceof Error ? error.message : "Unknown auth error"}`,
      { request: { method: "PATCH", url: request.url } },
      ErrorSeverity.WARNING
    );
    return createAuthErrorResponse(error as Error);
  }

  const { modelId } = await params;
  let updateData: z.infer<typeof UpdateModelSchema>;

  try {
    const body = await request.json();
    updateData = UpdateModelSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new ChatSDKError(
        "bad_request:api",
        `Validation failed: ${error.errors.map((e) => e.message).join(", ")}`
      ).toResponse();
    }
    return new ChatSDKError(
      "bad_request:api",
      "Invalid request body"
    ).toResponse();
  }

  try {
    const updatedModel = await updateModel(modelId, updateData);

    await logAdminError(
      ErrorCategory.CONFIG_UPDATE_FAILED, // Will be changed to success category when available
      `Model updated: ${modelId}`,
      { action: "update_model", modelId, updateData },
      user.id,
      ErrorSeverity.INFO
    );

    return Response.json(updatedModel, { status: 200 });
  } catch (error) {
    await logAdminError(
      ErrorCategory.CONFIG_UPDATE_FAILED,
      `Failed to update model ${modelId}: ${error instanceof Error ? error.message : "Unknown error"}`,
      { modelId, updateData },
      user.id,
      ErrorSeverity.ERROR
    );

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError(
      "bad_request:database",
      "Failed to update model"
    ).toResponse();
  }
}

// DELETE /api/admin/models/[modelId] - Delete a model
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
) {
  let user: User;

  try {
    const authResult = await requireAdmin();
    user = authResult.user;
  } catch (error) {
    await logApiError(
      ErrorCategory.UNAUTHORIZED_ACCESS,
      `Model DELETE request authentication failed: ${error instanceof Error ? error.message : "Unknown auth error"}`,
      { request: { method: "DELETE", url: request.url } },
      ErrorSeverity.WARNING
    );
    return createAuthErrorResponse(error as Error);
  }

  const { modelId } = await params;

  try {
    const deletedModel = await deleteModel(modelId);

    await logAdminError(
      ErrorCategory.CONFIG_UPDATE_FAILED, // Will be changed to success category when available
      `Model deleted: ${modelId}`,
      { action: "delete_model", modelId },
      user.id,
      ErrorSeverity.INFO
    );

    return Response.json(deletedModel, { status: 200 });
  } catch (error) {
    await logAdminError(
      ErrorCategory.CONFIG_UPDATE_FAILED,
      `Failed to delete model ${modelId}: ${error instanceof Error ? error.message : "Unknown error"}`,
      { modelId },
      user.id,
      ErrorSeverity.ERROR
    );

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError(
      "bad_request:database",
      "Failed to delete model"
    ).toResponse();
  }
}
