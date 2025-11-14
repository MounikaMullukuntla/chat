import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createAuthErrorResponse, requireAdmin } from "@/lib/auth/server";
import {
  createModel,
  getAllModels,
  getModelsByProvider,
} from "@/lib/db/queries/model-config";
import { ChatSDKError } from "@/lib/errors";
import {
  ErrorCategory,
  ErrorSeverity,
  logAdminError,
  logApiError,
} from "@/lib/errors/logger";

// Validation schema for model creation
const CreateModelSchema = z.object({
  modelId: z.string().min(1, "Model ID is required"),
  name: z.string().min(1, "Model name is required"),
  description: z.string().optional(),
  provider: z.enum(["google", "openai", "anthropic"]),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  thinkingEnabled: z.boolean().default(true),
  inputPricingPerMillionTokens: z.string().min(1, "Input pricing is required"),
  outputPricingPerMillionTokens: z
    .string()
    .min(1, "Output pricing is required"),
  metadata: z.record(z.any()).optional(),
});

// GET /api/admin/models - Get all models or models by provider
export async function GET(request: NextRequest) {
  let user: User;

  try {
    const authResult = await requireAdmin();
    user = authResult.user;
  } catch (error) {
    await logApiError(
      ErrorCategory.UNAUTHORIZED_ACCESS,
      `Models GET request authentication failed: ${error instanceof Error ? error.message : "Unknown auth error"}`,
      { request: { method: "GET", url: request.url } },
      ErrorSeverity.WARNING
    );
    return createAuthErrorResponse(error as Error);
  }

  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");

    let models;
    if (provider) {
      if (!["google", "openai", "anthropic"].includes(provider)) {
        return new ChatSDKError(
          "bad_request:api",
          `Invalid provider: ${provider}`
        ).toResponse();
      }
      models = await getModelsByProvider(provider);
    } else {
      models = await getAllModels();
    }

    return Response.json(models, { status: 200 });
  } catch (error) {
    await logApiError(
      ErrorCategory.DATABASE_ERROR,
      `Failed to retrieve models: ${error instanceof Error ? error.message : "Unknown error"}`,
      { request: { method: "GET", url: request.url }, user },
      ErrorSeverity.ERROR
    );
    return new ChatSDKError(
      "bad_request:database",
      "Failed to retrieve models"
    ).toResponse();
  }
}

// POST /api/admin/models - Create a new model
export async function POST(request: NextRequest) {
  let user: User;

  try {
    const authResult = await requireAdmin();
    user = authResult.user;
  } catch (error) {
    await logApiError(
      ErrorCategory.UNAUTHORIZED_ACCESS,
      `Models POST request authentication failed: ${error instanceof Error ? error.message : "Unknown auth error"}`,
      { request: { method: "POST", url: request.url } },
      ErrorSeverity.WARNING
    );
    return createAuthErrorResponse(error as Error);
  }

  let modelData: z.infer<typeof CreateModelSchema>;

  try {
    const body = await request.json();
    modelData = CreateModelSchema.parse(body);
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
    const createdModel = await createModel(modelData);

    await logAdminError(
      ErrorCategory.CONFIG_UPDATE_FAILED, // Will be changed to success category when available
      `Model created: ${modelData.modelId}`,
      { action: "create_model", modelData },
      user.id,
      ErrorSeverity.INFO
    );

    return Response.json(createdModel, { status: 201 });
  } catch (error) {
    await logAdminError(
      ErrorCategory.CONFIG_UPDATE_FAILED,
      `Failed to create model: ${error instanceof Error ? error.message : "Unknown error"}`,
      { modelData },
      user.id,
      ErrorSeverity.ERROR
    );
    return new ChatSDKError(
      "bad_request:database",
      "Failed to create model"
    ).toResponse();
  }
}
