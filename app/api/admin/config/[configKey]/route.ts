import type { User } from "@supabase/supabase-js";
import { createAuthErrorResponse, requireAdmin } from "@/lib/auth/server";
import {
  createAdminConfig,
  getAdminConfig,
  updateAdminConfig,
} from "@/lib/db/queries";
import { patchAdminConfig } from "@/lib/db/queries/admin";
import { ChatSDKError } from "@/lib/errors";
import {
  ErrorCategory,
  ErrorSeverity,
  logAdminError,
  logApiError,
} from "@/lib/errors/logger";
// Note: Validation is now handled by the centralized validation system in admin queries

// Import validation functions from admin queries
import {
  isValidAgentConfigKey,
  validateAgentConfigData,
  validatePartialAgentConfigData,
} from "@/lib/db/queries/admin";

// Valid agent types
const VALID_AGENT_TYPES = [
  "chat_model_agent",
  "provider_tools_agent",
  "document_agent",
  "python_agent",
  "mermaid_agent",
  "git_mcp_agent",
];

// Valid config types (including model configs)
const VALID_CONFIG_TYPES = [
  ...VALID_AGENT_TYPES,
  "model_config",
  "app_settings",
  "logging_settings",
];

const VALID_PROVIDERS = ["google", "openai", "anthropic"];

// Function to validate config key format: {config_type}_{provider} or special configs
function isValidConfigKey(configKey: string): boolean {
  // Use the centralized validation function
  return isValidAgentConfigKey(configKey);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ configKey: string }> }
) {
  const { configKey } = await params;

  // Validate config key format
  if (!isValidConfigKey(configKey)) {
    const errorMessage = `Invalid config key format. Must be {config_type}_{provider} or special config. Valid config types: ${VALID_CONFIG_TYPES.join(", ")}. Valid providers: ${VALID_PROVIDERS.join(", ")}`;

    await logApiError(
      ErrorCategory.INVALID_REQUEST,
      `Invalid admin config key requested: ${configKey}`,
      {
        request: {
          method: "GET",
          url: request.url,
          headers: Object.fromEntries(request.headers.entries()),
        },
      },
      ErrorSeverity.WARNING
    );

    return new ChatSDKError("bad_request:api", errorMessage).toResponse({
      request_path: request.url,
      request_method: "GET",
      user_agent: request.headers.get("user-agent") || undefined,
    });
  }

  // Authenticate and authorize admin user
  let user: User;
  try {
    const authResult = await requireAdmin();
    user = authResult.user;
  } catch (error) {
    await logApiError(
      ErrorCategory.UNAUTHORIZED_ACCESS,
      `Admin config GET request authentication failed for ${configKey}: ${error instanceof Error ? error.message : "Unknown auth error"}`,
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
    const config = await getAdminConfig({ configKey });

    if (!config) {
      await logApiError(
        ErrorCategory.API_REQUEST_FAILED,
        `Admin config not found: ${configKey}`,
        {
          request: {
            method: "GET",
            url: request.url,
          },
          user,
        },
        ErrorSeverity.INFO
      );

      return new ChatSDKError(
        "not_found:api",
        `Configuration for ${configKey} not found`
      ).toResponse();
    }

    return Response.json(
      {
        configKey: config.configKey,
        configData: config.configData,
        updatedAt: config.updatedAt,
        updatedBy: config.updatedBy,
      },
      { status: 200 }
    );
  } catch (error) {
    await logApiError(
      ErrorCategory.DATABASE_ERROR,
      `Failed to retrieve admin config ${configKey} from database: ${error instanceof Error ? error.message : "Unknown database error"}`,
      {
        request: {
          method: "GET",
          url: request.url,
        },
        user,
      },
      ErrorSeverity.ERROR
    );

    return new ChatSDKError("bad_request:database").toResponse();
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ configKey: string }> }
) {
  const { configKey } = await params;

  // Validate config key format
  if (!isValidConfigKey(configKey)) {
    const errorMessage = `Invalid config key format. Must be {config_type}_{provider} or special config. Valid config types: ${VALID_CONFIG_TYPES.join(", ")}. Valid providers: ${VALID_PROVIDERS.join(", ")}`;

    await logApiError(
      ErrorCategory.INVALID_REQUEST,
      `Invalid admin config key for deletion: ${configKey}`,
      {
        request: {
          method: "DELETE",
          url: request.url,
          headers: Object.fromEntries(request.headers.entries()),
        },
      },
      ErrorSeverity.WARNING
    );

    return new ChatSDKError("bad_request:api", errorMessage).toResponse({
      request_path: request.url,
      request_method: "DELETE",
      user_agent: request.headers.get("user-agent") || undefined,
    });
  }

  // Authenticate and authorize admin user
  let user: User;
  try {
    const authResult = await requireAdmin();
    user = authResult.user;
  } catch (error) {
    await logApiError(
      ErrorCategory.UNAUTHORIZED_ACCESS,
      `Admin config DELETE request authentication failed for ${configKey}: ${error instanceof Error ? error.message : "Unknown auth error"}`,
      {
        request: {
          method: "DELETE",
          url: request.url,
          headers: Object.fromEntries(request.headers.entries()),
        },
      },
      ErrorSeverity.WARNING
    );

    return createAuthErrorResponse(error as Error);
  }

  try {
    // Check if config exists
    const existingConfig = await getAdminConfig({ configKey });

    if (!existingConfig) {
      await logApiError(
        ErrorCategory.API_REQUEST_FAILED,
        `Admin config not found for deletion: ${configKey}`,
        {
          request: {
            method: "DELETE",
            url: request.url,
          },
          user,
        },
        ErrorSeverity.INFO
      );

      return new ChatSDKError(
        "not_found:api",
        `Configuration for ${configKey} not found`
      ).toResponse();
    }

    // Import delete function
    const { deleteAdminConfig } = await import("@/lib/db/queries/admin");

    await deleteAdminConfig({ configKey });

    // Log successful deletion
    await logAdminError(
      ErrorCategory.CONFIG_UPDATE_FAILED, // This will be changed to success category when available
      `Admin config deleted successfully: ${configKey}`,
      {
        action: "delete",
        deletedData: existingConfig.configData,
      },
      user.id,
      ErrorSeverity.INFO
    );

    return Response.json(
      {
        success: true,
        message: `Configuration for ${configKey} deleted successfully`,
        deletedConfig: {
          configKey: existingConfig.configKey,
          updatedAt: existingConfig.updatedAt,
          updatedBy: existingConfig.updatedBy,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    await logAdminError(
      ErrorCategory.CONFIG_UPDATE_FAILED,
      `Failed to delete admin config ${configKey} from database: ${error instanceof Error ? error.message : "Unknown database error"}`,
      {},
      user.id,
      ErrorSeverity.ERROR
    );

    return new ChatSDKError("bad_request:database").toResponse();
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ configKey: string }> }
) {
  const { configKey } = await params;

  // Validate config key format
  if (!isValidConfigKey(configKey)) {
    const errorMessage = `Invalid config key format. Must be {config_type}_{provider} or special config. Valid config types: ${VALID_CONFIG_TYPES.join(", ")}. Valid providers: ${VALID_PROVIDERS.join(", ")}`;

    await logApiError(
      ErrorCategory.INVALID_REQUEST,
      `Invalid admin config key for update: ${configKey}`,
      {
        request: {
          method: "PUT",
          url: request.url,
          headers: Object.fromEntries(request.headers.entries()),
        },
      },
      ErrorSeverity.WARNING
    );

    return new ChatSDKError("bad_request:api", errorMessage).toResponse({
      request_path: request.url,
      request_method: "PUT",
      user_agent: request.headers.get("user-agent") || undefined,
    });
  }

  // Authenticate and authorize admin user
  let user: User;
  try {
    const authResult = await requireAdmin();
    user = authResult.user;
  } catch (error) {
    await logApiError(
      ErrorCategory.UNAUTHORIZED_ACCESS,
      `Admin config PUT request authentication failed for ${configKey}: ${error instanceof Error ? error.message : "Unknown auth error"}`,
      {
        request: {
          method: "PUT",
          url: request.url,
          headers: Object.fromEntries(request.headers.entries()),
        },
      },
      ErrorSeverity.WARNING
    );

    return createAuthErrorResponse(error as Error);
  }

  // Parse and validate request body
  let configData;
  try {
    const body = await request.json();

    // Use the new validation system
    const validationResult = validateAgentConfigData(configKey, body);
    if (!validationResult.isValid) {
      await logAdminError(
        ErrorCategory.VALIDATION_ERROR,
        `Admin config validation failed for ${configKey}: ${validationResult.errors.join(", ")}`,
        {
          requestBody: body,
          validationErrors: validationResult.errors,
          validationWarnings: validationResult.warnings,
        },
        user.id,
        ErrorSeverity.WARNING
      );

      return new ChatSDKError(
        "bad_request:api",
        `Validation failed: ${validationResult.errors.join(", ")}`
      ).toResponse({
        request_path: request.url,
        request_method: "PUT",
        user_agent: request.headers.get("user-agent") || undefined,
        user_id: user.id,
      });
    }

    configData = body;

    // Log warnings if any
    if (validationResult.warnings.length > 0) {
      await logAdminError(
        ErrorCategory.VALIDATION_ERROR,
        `Admin config validation warnings for ${configKey}: ${validationResult.warnings.join(", ")}`,
        {
          requestBody: body,
          validationWarnings: validationResult.warnings,
        },
        user.id,
        ErrorSeverity.INFO
      );
    }
  } catch (error) {
    await logAdminError(
      ErrorCategory.VALIDATION_ERROR,
      `Admin config parsing failed for ${configKey}: ${error instanceof Error ? error.message : "Unknown validation error"}`,
      {
        requestBody: error,
      },
      user.id,
      ErrorSeverity.WARNING
    );

    return new ChatSDKError(
      "bad_request:api",
      "Invalid JSON in request body"
    ).toResponse({
      request_path: request.url,
      request_method: "PUT",
      user_agent: request.headers.get("user-agent") || undefined,
      user_id: user.id,
    });
  }

  try {
    // Check if config exists
    const existingConfig = await getAdminConfig({ configKey });

    let updatedConfig;
    if (existingConfig) {
      // Update existing config
      updatedConfig = await updateAdminConfig({
        configKey,
        configData,
        updatedBy: user.id,
      });
    } else {
      // Create new config
      updatedConfig = await createAdminConfig({
        configKey,
        configData,
        updatedBy: user.id,
      });
    }

    // Log successful admin action
    await logAdminError(
      ErrorCategory.CONFIG_UPDATE_FAILED, // This will be changed to success category when available
      `Admin config ${existingConfig ? "updated" : "created"} successfully: ${configKey}`,
      {
        action: existingConfig ? "update" : "create",
        previousData: existingConfig?.configData,
        newData: configData,
      },
      user.id,
      ErrorSeverity.INFO
    );

    return Response.json(
      {
        configKey: updatedConfig.configKey,
        configData: updatedConfig.configData,
        updatedAt: updatedConfig.updatedAt,
        updatedBy: updatedConfig.updatedBy,
      },
      { status: 200 }
    );
  } catch (error) {
    await logAdminError(
      ErrorCategory.CONFIG_UPDATE_FAILED,
      `Failed to update admin config ${configKey} in database: ${error instanceof Error ? error.message : "Unknown database error"}`,
      {
        configData,
      },
      user.id,
      ErrorSeverity.ERROR
    );

    return new ChatSDKError("bad_request:database").toResponse();
  }
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ configKey: string }> }
) {
  const { configKey } = await params;

  // Validate config key format
  if (!isValidConfigKey(configKey)) {
    const errorMessage = `Invalid config key format. Must be {config_type}_{provider} or special config. Valid config types: ${VALID_CONFIG_TYPES.join(", ")}. Valid providers: ${VALID_PROVIDERS.join(", ")}`;

    await logApiError(
      ErrorCategory.INVALID_REQUEST,
      `Invalid admin config key for patch: ${configKey}`,
      {
        request: {
          method: "PATCH",
          url: request.url,
          headers: Object.fromEntries(request.headers.entries()),
        },
      },
      ErrorSeverity.WARNING
    );

    return new ChatSDKError("bad_request:api", errorMessage).toResponse({
      request_path: request.url,
      request_method: "PATCH",
      user_agent: request.headers.get("user-agent") || undefined,
    });
  }

  // Authenticate and authorize admin user
  let user: User;
  try {
    const authResult = await requireAdmin();
    user = authResult.user;
  } catch (error) {
    await logApiError(
      ErrorCategory.UNAUTHORIZED_ACCESS,
      `Admin config PATCH request authentication failed for ${configKey}: ${error instanceof Error ? error.message : "Unknown auth error"}`,
      {
        request: {
          method: "PATCH",
          url: request.url,
          headers: Object.fromEntries(request.headers.entries()),
        },
      },
      ErrorSeverity.WARNING
    );

    return createAuthErrorResponse(error as Error);
  }

  // Parse and validate request body
  let partialConfigData;
  try {
    const body = await request.json();

    // Use the new partial validation system
    const validationResult = validatePartialAgentConfigData(configKey, body);
    if (!validationResult.isValid) {
      await logAdminError(
        ErrorCategory.VALIDATION_ERROR,
        `Admin config partial validation failed for ${configKey}: ${validationResult.errors.join(", ")}`,
        {
          requestBody: body,
          validationErrors: validationResult.errors,
          validationWarnings: validationResult.warnings,
        },
        user.id,
        ErrorSeverity.WARNING
      );

      return new ChatSDKError(
        "bad_request:api",
        `Validation failed: ${validationResult.errors.join(", ")}`
      ).toResponse({
        request_path: request.url,
        request_method: "PATCH",
        user_agent: request.headers.get("user-agent") || undefined,
        user_id: user.id,
      });
    }

    partialConfigData = body;

    // Log warnings if any
    if (validationResult.warnings.length > 0) {
      await logAdminError(
        ErrorCategory.VALIDATION_ERROR,
        `Admin config partial validation warnings for ${configKey}: ${validationResult.warnings.join(", ")}`,
        {
          requestBody: body,
          validationWarnings: validationResult.warnings,
        },
        user.id,
        ErrorSeverity.INFO
      );
    }
  } catch (error) {
    await logAdminError(
      ErrorCategory.VALIDATION_ERROR,
      `Admin config parsing failed for ${configKey}: ${error instanceof Error ? error.message : "Unknown validation error"}`,
      {
        requestBody: error,
      },
      user.id,
      ErrorSeverity.WARNING
    );

    return new ChatSDKError(
      "bad_request:api",
      "Invalid JSON in request body"
    ).toResponse({
      request_path: request.url,
      request_method: "PATCH",
      user_agent: request.headers.get("user-agent") || undefined,
      user_id: user.id,
    });
  }

  try {
    // Check if config exists
    const existingConfig = await getAdminConfig({ configKey });

    if (!existingConfig) {
      await logApiError(
        ErrorCategory.API_REQUEST_FAILED,
        `Admin config not found for patch: ${configKey}`,
        {
          request: {
            method: "PATCH",
            url: request.url,
          },
          user,
        },
        ErrorSeverity.INFO
      );

      return new ChatSDKError(
        "not_found:api",
        `Configuration for ${configKey} not found`
      ).toResponse();
    }

    // Perform partial update
    const updatedConfig = await patchAdminConfig({
      configKey,
      partialConfigData,
      updatedBy: user.id,
    });

    // Log successful admin action
    await logAdminError(
      ErrorCategory.CONFIG_UPDATE_FAILED, // This will be changed to success category when available
      `Admin config patched successfully: ${configKey}`,
      {
        action: "patch",
        previousData: existingConfig.configData,
        patchData: partialConfigData,
        newData: updatedConfig.configData,
      },
      user.id,
      ErrorSeverity.INFO
    );

    return Response.json(
      {
        configKey: updatedConfig.configKey,
        configData: updatedConfig.configData,
        updatedAt: updatedConfig.updatedAt,
        updatedBy: updatedConfig.updatedBy,
      },
      { status: 200 }
    );
  } catch (error) {
    await logAdminError(
      ErrorCategory.CONFIG_UPDATE_FAILED,
      `Failed to patch admin config ${configKey} in database: ${error instanceof Error ? error.message : "Unknown database error"}`,
      {
        partialConfigData,
      },
      user.id,
      ErrorSeverity.ERROR
    );

    return new ChatSDKError("bad_request:database").toResponse();
  }
}
