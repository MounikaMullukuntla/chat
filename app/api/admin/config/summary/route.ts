import type { User } from "@supabase/supabase-js";
import { createAuthErrorResponse, requireAdmin } from "@/lib/auth/server";
import {
  getAdminConfigSummary,
  getAllAgentConfigs,
} from "@/lib/db/queries/admin";
import { ChatSDKError } from "@/lib/errors";
import { ErrorCategory, ErrorSeverity, logApiError } from "@/lib/errors/logger";
import {
  logUserActivity,
  createCorrelationId,
  UserActivityType,
  ActivityCategory,
} from "@/lib/logging";

// Valid agent types and providers
const VALID_AGENT_TYPES = [
  "chat_model_agent",
  "provider_tools_agent",
  "document_agent",
  "python_agent",
  "mermaid_agent",
  "git_mcp_agent",
];

const VALID_PROVIDERS = ["google", "openai", "anthropic"];

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  // Authenticate and authorize admin user
  let user: User;
  try {
    const authResult = await requireAdmin();
    user = authResult.user;
  } catch (error) {
    await logApiError(
      ErrorCategory.UNAUTHORIZED_ACCESS,
      `Admin config summary GET request authentication failed: ${error instanceof Error ? error.message : "Unknown auth error"}`,
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
    const allConfigs = await getAllAgentConfigs();

    // Get enhanced summary with model capabilities
    const enhancedSummary = await getAdminConfigSummary();

    // Calculate provider statistics (consolidating stats endpoint functionality)
    const providerStats: Record<
      string,
      { activeAgents: number; totalAgents: number }
    > = {};

    VALID_PROVIDERS.forEach((provider) => {
      let activeAgents = 0;
      let totalAgents = 0;

      VALID_AGENT_TYPES.forEach((agentType) => {
        const configKey = `${agentType}_${provider}`;
        const config = allConfigs.find((c) => c.configKey === configKey);

        if (config) {
          totalAgents++;
          if ((config.configData as any)?.enabled === true) {
            activeAgents++;
          }
        }
      });

      providerStats[provider] = {
        activeAgents,
        totalAgents,
      };
    });

    // Build comprehensive summary combining all functionality
    const summary = {
      agentTypes: VALID_AGENT_TYPES.map((agentType) => {
        const agentConfigs = allConfigs.filter((config) =>
          config.configKey.startsWith(`${agentType}_`)
        );

        const providers = VALID_PROVIDERS.map((provider) => {
          const config = agentConfigs.find(
            (c) => c.configKey === `${agentType}_${provider}`
          );
          return {
            provider,
            configured: !!config,
            enabled: (config?.configData as any)?.enabled || false,
            lastUpdated: config?.updatedAt || null,
            updatedBy: config?.updatedBy || null,
          };
        });

        return {
          agentType,
          totalConfigs: agentConfigs.length,
          enabledConfigs: agentConfigs.filter(
            (c) => (c.configData as any)?.enabled
          ).length,
          providers,
        };
      }),
      providers: VALID_PROVIDERS.map((provider) => {
        const providerConfigs = allConfigs.filter((config) =>
          config.configKey.endsWith(`_${provider}`)
        );

        const agentTypes = VALID_AGENT_TYPES.map((agentType) => {
          const config = providerConfigs.find(
            (c) => c.configKey === `${agentType}_${provider}`
          );
          return {
            agentType,
            configured: !!config,
            enabled: (config?.configData as any)?.enabled || false,
            lastUpdated: config?.updatedAt || null,
          };
        });

        return {
          provider,
          totalConfigs: providerConfigs.length,
          enabledConfigs: providerConfigs.filter(
            (c) => (c.configData as any)?.enabled
          ).length,
          agentTypes,
        };
      }),
      overall: {
        totalConfigurations: allConfigs.length,
        enabledConfigurations: allConfigs.filter(
          (c) => (c.configData as any)?.enabled
        ).length,
        supportedAgentTypes: VALID_AGENT_TYPES.length,
        supportedProviders: VALID_PROVIDERS.length,
        lastUpdated:
          allConfigs.length > 0
            ? Math.max(
                ...allConfigs.map((c) =>
                  new Date(c.updatedAt || new Date()).getTime()
                )
              )
            : null,
      },
      // Provider statistics (from stats endpoint)
      stats: providerStats,
      // Model capabilities (from capabilities endpoint)
      capabilities: enhancedSummary,
    };

    // Log successful admin dashboard view
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: UserActivityType.ADMIN_DASHBOARD_VIEW,
      activity_category: ActivityCategory.ADMIN,
      activity_metadata: {
        config_count: allConfigs.length,
        enabled_agents: allConfigs.filter((c) => (c.configData as any)?.enabled)
          .length,
      },
      request_path: request.url,
      request_method: "GET",
      success: true,
    });

    return Response.json(summary, {
      status: 200,
      headers: {
        "X-Consolidated-Endpoints": "stats,capabilities",
        "X-API-Version": "2.0",
      },
    });
  } catch (error) {
    // Log failed admin dashboard view
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: UserActivityType.ADMIN_DASHBOARD_VIEW,
      activity_category: ActivityCategory.ADMIN,
      success: false,
      error_message: error instanceof Error ? error.message : "Unknown error",
    });

    await logApiError(
      ErrorCategory.DATABASE_ERROR,
      `Failed to retrieve config summary from database: ${error instanceof Error ? error.message : "Unknown database error"}`,
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
