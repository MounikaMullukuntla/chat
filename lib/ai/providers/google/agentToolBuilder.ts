import "server-only";

import { tool } from "ai";
import { z } from "zod";
import {
  logAgentActivity,
  PerformanceTracker,
  createCorrelationId,
  AgentType,
  AgentOperationType,
  AgentOperationCategory,
} from "@/lib/logging/activity-logger";
import { AgentError, ErrorCodes } from "../../core/errors";
import type { ChatModelAgentConfig } from "../../core/types";
import type { AgentConfigLoader } from "./agentConfigLoader";

/**
 * Agent tool builder
 * Builds AI SDK tools from specialized agents
 */
export class AgentToolBuilder {
  constructor(
    private readonly config: ChatModelAgentConfig,
    private readonly configLoader: AgentConfigLoader
  ) {}

  /**
   * Build AI SDK tools - Specialized agents are treated as individual tools
   */
  buildTools(
    dataStream: any,
    user?: any,
    chatId?: string
  ): Record<string, any> | undefined {
    const correlationId = createCorrelationId();
    const tracker = new PerformanceTracker();
    const tools: Record<string, any> = {};
    const enabledTools: string[] = [];

    // Provider Tools Agent as a single tool
    const providerToolsAgent = this.configLoader.getProviderToolsAgent();
    const providerToolsConfig = this.configLoader.getProviderToolsConfig();

    if (
      providerToolsAgent &&
      providerToolsConfig?.enabled &&
      this.config.tools?.providerToolsAgent?.enabled
    ) {
      // Check if tool description is missing and throw error
      if (!this.config.tools.providerToolsAgent.description) {
        throw new AgentError(
          "google-chat",
          ErrorCodes.INVALID_CONFIGURATION,
          "providerToolsAgent tool description is required when tool is enabled"
        );
      }

      // Check if tool parameter description is missing and throw error
      if (
        !this.config.tools.providerToolsAgent.tool_input?.parameter_description
      ) {
        throw new AgentError(
          "google-chat",
          ErrorCodes.INVALID_CONFIGURATION,
          "providerToolsAgent tool parameter description is required when tool is enabled"
        );
      }

      tools.providerToolsAgent = tool({
        description: this.config.tools.providerToolsAgent.description,
        inputSchema: z.object({
          input: z
            .string()
            .describe(
              this.config.tools.providerToolsAgent.tool_input
                .parameter_description
            ),
        }),
        execute: async (params: { input: string }) => {
          console.log(
            "🔧 [TOOL-CALL] Provider Tools Agent executing:",
            params.input.substring(0, 100)
          );

          // Execute provider tools agent
          const result = await providerToolsAgent.execute({
            input: params.input,
            userId: user?.id,
          });

          // Return ONLY the output string - AI SDK will use this to continue generation
          return result.output;
        },
      });
      enabledTools.push("providerToolsAgent");
    }

    // Document Agent as a single tool (using streaming version)
    const documentAgentStreaming =
      this.configLoader.getDocumentAgentStreaming();
    const documentAgentConfig = this.configLoader.getDocumentAgentConfig();

    if (
      documentAgentStreaming &&
      documentAgentConfig?.enabled &&
      this.config.tools?.documentAgent?.enabled
    ) {
      // Check if tool description is missing and throw error
      if (!this.config.tools.documentAgent.description) {
        throw new AgentError(
          "google-chat",
          ErrorCodes.INVALID_CONFIGURATION,
          "documentAgent tool description is required when tool is enabled"
        );
      }

      // Check if tool parameter descriptions are missing and throw error
      if (
        !this.config.tools.documentAgent.tool_input?.operation
          ?.parameter_description ||
        !this.config.tools.documentAgent.tool_input?.instruction
          ?.parameter_description
      ) {
        throw new AgentError(
          "google-chat",
          ErrorCodes.INVALID_CONFIGURATION,
          "documentAgent tool parameter descriptions (operation and instruction) are required when tool is enabled"
        );
      }

      tools.documentAgent = tool({
        description: this.config.tools.documentAgent.description,
        inputSchema: z.object({
          operation: z
            .enum(["create", "update", "revert", "suggestion"])
            .describe(
              this.config.tools.documentAgent.tool_input.operation
                .parameter_description
            ),
          instruction: z
            .string()
            .describe(
              this.config.tools.documentAgent.tool_input.instruction
                .parameter_description
            ),
          documentId: z
            .string()
            .uuid()
            .optional()
            .describe(
              this.config.tools.documentAgent.tool_input.documentId
                .parameter_description
            ),
          targetVersion: z
            .number()
            .int()
            .positive()
            .optional()
            .describe(
              this.config.tools.documentAgent.tool_input.targetVersion
                .parameter_description
            ),
        }),
        execute: async (params: {
          operation: "create" | "update" | "revert" | "suggestion";
          instruction: string;
          documentId?: string;
          targetVersion?: number;
        }) => {
          console.log("📄 [TOOL-CALL] Document Agent executing");
          console.log("📄 [TOOL-CALL] Operation:", params.operation);
          console.log(
            "📄 [TOOL-CALL] Instruction:",
            params.instruction.substring(0, 100)
          );
          console.log(
            "📄 [TOOL-CALL] Document ID:",
            params.documentId || "not provided"
          );
          console.log(
            "📄 [TOOL-CALL] Target Version:",
            params.targetVersion || "not provided"
          );

          // Execute document agent (streaming version)
          const result = await documentAgentStreaming.execute({
            operation: params.operation,
            instruction: params.instruction,
            documentId: params.documentId,
            targetVersion: params.targetVersion,
            dataStream,
            user,
            chatId,
          });

          // Return the structured output from document agent
          console.log(
            "📄 [TOOL-CALL] documentAgent returning type:",
            typeof result.output
          );
          console.log(
            "📄 [TOOL-CALL] documentAgent returning value:",
            JSON.stringify(result.output)
          );

          // IMPORTANT: Verify the return value is JSON serializable
          if (result.output && typeof result.output === "object") {
            const cleanOutput = {
              id: result.output.id,
              title: result.output.title,
              kind: result.output.kind || "text",
            };
            console.log(
              "📄 [TOOL-CALL] Returning cleaned output:",
              JSON.stringify(cleanOutput)
            );
            return cleanOutput;
          }

          return result.output;
        },
      });
      enabledTools.push("documentAgent");
    }

    // Mermaid Agent as a single tool (using streaming version)
    const mermaidAgentStreaming = this.configLoader.getMermaidAgentStreaming();
    const mermaidAgentConfig = this.configLoader.getMermaidAgentConfig();

    if (
      mermaidAgentStreaming &&
      mermaidAgentConfig?.enabled &&
      this.config.tools?.mermaidAgent?.enabled
    ) {
      // Check if tool description is missing and throw error
      if (!this.config.tools.mermaidAgent.description) {
        throw new AgentError(
          "google-chat",
          ErrorCodes.INVALID_CONFIGURATION,
          "mermaidAgent tool description is required when tool is enabled"
        );
      }

      // Check if tool parameter descriptions are missing and throw error
      if (
        !this.config.tools.mermaidAgent.tool_input?.operation
          ?.parameter_description ||
        !this.config.tools.mermaidAgent.tool_input?.instruction
          ?.parameter_description
      ) {
        throw new AgentError(
          "google-chat",
          ErrorCodes.INVALID_CONFIGURATION,
          "mermaidAgent tool parameter descriptions (operation and instruction) are required when tool is enabled"
        );
      }

      tools.mermaidAgent = tool({
        description: this.config.tools.mermaidAgent.description,
        inputSchema: z.object({
          operation: z
            .enum(["generate", "create", "update", "fix", "revert"])
            .describe(
              this.config.tools.mermaidAgent.tool_input.operation
                .parameter_description
            ),
          instruction: z
            .string()
            .describe(
              this.config.tools.mermaidAgent.tool_input.instruction
                .parameter_description
            ),
          diagramId: z
            .string()
            .uuid()
            .optional()
            .describe(
              this.config.tools.mermaidAgent.tool_input.diagramId
                .parameter_description
            ),
          targetVersion: z
            .number()
            .int()
            .positive()
            .optional()
            .describe(
              this.config.tools.mermaidAgent.tool_input.targetVersion
                .parameter_description
            ),
        }),
        execute: async (params: {
          operation: "generate" | "create" | "update" | "fix" | "revert";
          instruction: string;
          diagramId?: string;
          targetVersion?: number;
        }) => {
          console.log("🎨 [TOOL-CALL] Mermaid Agent executing");
          console.log("🎨 [TOOL-CALL] Operation:", params.operation);
          console.log(
            "🎨 [TOOL-CALL] Instruction:",
            params.instruction.substring(0, 100)
          );
          console.log(
            "🎨 [TOOL-CALL] Diagram ID:",
            params.diagramId || "not provided"
          );
          console.log(
            "🎨 [TOOL-CALL] Target Version:",
            params.targetVersion || "not provided"
          );

          // Execute mermaid agent (streaming version)
          const result = await mermaidAgentStreaming.execute({
            operation: params.operation,
            instruction: params.instruction,
            diagramId: params.diagramId,
            targetVersion: params.targetVersion,
            dataStream,
            user,
            chatId,
          });

          // Return the structured output from mermaid agent
          console.log(
            "🎨 [TOOL-CALL] mermaidAgent returning type:",
            typeof result.output
          );
          console.log(
            "🎨 [TOOL-CALL] mermaidAgent returning value:",
            JSON.stringify(result.output)
          );

          // IMPORTANT: Verify the return value is JSON serializable
          if (result.output && typeof result.output === "object") {
            // For generate mode, return the code directly
            if (result.output.generated && result.output.code) {
              console.log("🎨 [TOOL-CALL] Returning generated code");
              return { code: result.output.code, generated: true };
            }

            // For other modes, return clean metadata
            const cleanOutput = {
              id: result.output.id,
              title: result.output.title,
              kind: result.output.kind || "mermaid code",
            };
            console.log(
              "🎨 [TOOL-CALL] Returning cleaned output:",
              JSON.stringify(cleanOutput)
            );
            return cleanOutput;
          }

          return result.output;
        },
      });
      enabledTools.push("mermaidAgent");
    }

    // Python Agent as a single tool (using streaming version)
    const pythonAgentStreaming = this.configLoader.getPythonAgentStreaming();
    const pythonAgentConfig = this.configLoader.getPythonAgentConfig();

    if (
      pythonAgentStreaming &&
      pythonAgentConfig?.enabled &&
      this.config.tools?.pythonAgent?.enabled
    ) {
      // Check if tool description is missing and throw error
      if (!this.config.tools.pythonAgent.description) {
        throw new AgentError(
          "google-chat",
          ErrorCodes.INVALID_CONFIGURATION,
          "pythonAgent tool description is required when tool is enabled"
        );
      }

      // Check if tool parameter descriptions are missing and throw error
      if (
        !this.config.tools.pythonAgent.tool_input?.operation
          ?.parameter_description ||
        !this.config.tools.pythonAgent.tool_input?.instruction
          ?.parameter_description
      ) {
        throw new AgentError(
          "google-chat",
          ErrorCodes.INVALID_CONFIGURATION,
          "pythonAgent tool parameter descriptions (operation and instruction) are required when tool is enabled"
        );
      }

      tools.pythonAgent = tool({
        description: this.config.tools.pythonAgent.description,
        inputSchema: z.object({
          operation: z
            .enum(["generate", "create", "update", "fix", "explain", "revert"])
            .describe(
              this.config.tools.pythonAgent.tool_input.operation
                .parameter_description
            ),
          instruction: z
            .string()
            .describe(
              this.config.tools.pythonAgent.tool_input.instruction
                .parameter_description
            ),
          codeId: z
            .string()
            .uuid()
            .optional()
            .describe(
              this.config.tools.pythonAgent.tool_input.codeId
                .parameter_description
            ),
          targetVersion: z
            .number()
            .int()
            .positive()
            .optional()
            .describe(
              this.config.tools.pythonAgent.tool_input.targetVersion
                .parameter_description
            ),
        }),
        execute: async (params: {
          operation:
            | "generate"
            | "create"
            | "update"
            | "fix"
            | "explain"
            | "revert";
          instruction: string;
          codeId?: string;
          targetVersion?: number;
        }) => {
          console.log("🐍 [TOOL-CALL] Python Agent executing");
          console.log("🐍 [TOOL-CALL] Operation:", params.operation);
          console.log(
            "🐍 [TOOL-CALL] Instruction:",
            params.instruction.substring(0, 100)
          );
          console.log(
            "🐍 [TOOL-CALL] Code ID:",
            params.codeId || "not provided"
          );
          console.log(
            "🐍 [TOOL-CALL] Target Version:",
            params.targetVersion || "not provided"
          );

          // Execute python agent (streaming version)
          const result = await pythonAgentStreaming.execute({
            operation: params.operation,
            instruction: params.instruction,
            codeId: params.codeId,
            targetVersion: params.targetVersion,
            dataStream,
            user,
            chatId,
          });

          // Return the structured output from python agent
          console.log(
            "🐍 [TOOL-CALL] pythonAgent returning type:",
            typeof result.output
          );
          console.log(
            "🐍 [TOOL-CALL] pythonAgent returning value:",
            JSON.stringify(result.output)
          );

          // IMPORTANT: Verify the return value is JSON serializable
          if (result.output && typeof result.output === "object") {
            // For generate mode, return the code directly
            if (result.output.generated && result.output.code) {
              console.log("🐍 [TOOL-CALL] Returning generated code");
              return { code: result.output.code, generated: true };
            }

            // For other modes, return clean metadata
            const cleanOutput = {
              id: result.output.id,
              title: result.output.title,
              kind: result.output.kind || "python code",
            };
            console.log(
              "🐍 [TOOL-CALL] Returning cleaned output:",
              JSON.stringify(cleanOutput)
            );
            return cleanOutput;
          }

          return result.output;
        },
      });
      enabledTools.push("pythonAgent");
    }

    // GitHub MCP Agent as a single tool
    const gitMcpAgent = this.configLoader.getGitMcpAgent();
    const gitMcpAgentConfig = this.configLoader.getGitMcpAgentConfig();

    if (
      gitMcpAgent &&
      gitMcpAgentConfig?.enabled &&
      this.config.tools?.gitMcpAgent?.enabled
    ) {
      // Check if tool description is missing and throw error
      if (!this.config.tools.gitMcpAgent.description) {
        throw new AgentError(
          "google-chat",
          ErrorCodes.INVALID_CONFIGURATION,
          "gitMcpAgent tool description is required when tool is enabled"
        );
      }

      // Check if tool parameter description is missing and throw error
      if (!this.config.tools.gitMcpAgent.tool_input?.parameter_description) {
        throw new AgentError(
          "google-chat",
          ErrorCodes.INVALID_CONFIGURATION,
          "gitMcpAgent tool parameter description is required when tool is enabled"
        );
      }

      tools.gitMcpAgent = tool({
        description: this.config.tools.gitMcpAgent.description,
        inputSchema: z.object({
          input: z
            .string()
            .describe(
              this.config.tools.gitMcpAgent.tool_input.parameter_description
            ),
        }),
        execute: async (params: { input: string }) => {
          console.log(`\n${"█".repeat(80)}`);
          console.log("🎯 [CHAT-AGENT] Delegating to GitHub MCP Agent");
          console.log("█".repeat(80));
          console.log(
            "📝 [CHAT-AGENT] User query:",
            params.input.substring(0, 150) +
              (params.input.length > 150 ? "..." : "")
          );
          console.log("█".repeat(80));

          // Check if agent is ready
          if (!gitMcpAgent.isReady()) {
            console.error("❌ [CHAT-AGENT] GitHub MCP Agent not ready");
            return "Error: GitHub MCP Agent is not properly configured. Please ensure GitHub PAT and Google API key are set.";
          }

          // Execute GitHub MCP agent
          const result = await gitMcpAgent.execute({
            input: params.input,
            userId: user?.id,
          });

          console.log(`\n${"█".repeat(80)}`);
          console.log(
            "🔙 [CHAT-AGENT] Received response from GitHub MCP Agent"
          );
          console.log("█".repeat(80));
          if (!result.success) {
            console.error(
              "❌ [CHAT-AGENT] GitHub MCP Agent returned error:",
              result.error
            );
            console.log(`${"█".repeat(80)}\n`);
            return `Error: ${result.error || "Unknown error occurred"}`;
          }

          console.log(
            "✅ [CHAT-AGENT] GitHub MCP Agent completed successfully"
          );
          console.log(
            "📊 [CHAT-AGENT] Response length:",
            result.output.length,
            "chars"
          );
          if (result.toolCalls && result.toolCalls.length > 0) {
            console.log(
              "🔧 [CHAT-AGENT] MCP tools used:",
              result.toolCalls.map((tc) => tc.toolName).join(", ")
            );
          }
          console.log(
            "📤 [CHAT-AGENT] Returning result to main Chat Agent for final response generation"
          );
          console.log(`${"█".repeat(80)}\n`);

          // Return ONLY the output string - AI SDK will use this to continue generation
          return result.output;
        },
      });
      enabledTools.push("gitMcpAgent");
    }

    if (enabledTools.length > 0) {
      console.log("🔧 [TOOLS-READY] Enabled tools:", enabledTools.join(", "));

      // Log successful tool building
      logAgentActivity({
        agentType: AgentType.CHAT_MODEL_AGENT,
        operationType: AgentOperationType.TOOL_INVOCATION,
        category: AgentOperationCategory.TOOL_USE,
        correlationId,
        success: true,
        duration: tracker.getDuration(),
        metadata: {
          tools_built: enabledTools,
          enabled_agents: enabledTools.join(", "),
        },
      }).catch((error) => {
        console.error("Failed to log tool building activity:", error);
      });

      return tools;
    }

    console.log("⚠️  [TOOLS-READY] No tools enabled");

    // Log no tools enabled
    logAgentActivity({
      agentType: AgentType.CHAT_MODEL_AGENT,
      operationType: AgentOperationType.TOOL_INVOCATION,
      category: AgentOperationCategory.TOOL_USE,
      correlationId,
      success: false,
      duration: tracker.getDuration(),
      metadata: {
        tools_built: [],
        enabled_agents: "none",
        reason: "no tools enabled",
      },
    }).catch((error) => {
      console.error("Failed to log tool building activity:", error);
    });

    return;
  }
}
