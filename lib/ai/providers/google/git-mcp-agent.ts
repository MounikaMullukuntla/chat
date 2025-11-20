import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { streamText, tool } from "ai";
import { z } from "zod";
import {
  AgentOperationCategory,
  AgentOperationType,
  AgentType,
  createCorrelationId,
  logAgentActivity,
  PerformanceTracker,
} from "@/lib/logging/activity-logger";
import type { AgentResult, GitMcpAgentConfig } from "@/lib/types";

export class GoogleGitMcpAgent {
  private readonly config: GitMcpAgentConfig;
  private githubPAT?: string;
  private modelId?: string;
  private googleProvider?: any;
  private readonly mcpClient?: any;

  constructor(config: GitMcpAgentConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Validates the agent configuration
   */
  private validateConfig(): void {
    if (!this.config.systemPrompt) {
      throw new Error("GitMcpAgent: systemPrompt is required in configuration");
    }
    if (!this.config.rateLimit) {
      throw new Error("GitMcpAgent: rateLimit is required in configuration");
    }
  }

  /**
   * Sets the GitHub Personal Access Token for authentication
   * @param pat GitHub Personal Access Token
   */
  setApiKey(pat: string): void {
    if (!pat || pat.trim() === "") {
      throw new Error("GitMcpAgent: GitHub PAT cannot be empty");
    }
    this.githubPAT = pat;
  }

  /**
   * Sets the model ID for the agent
   * @param modelId Google model identifier
   */
  setModel(modelId: string): void {
    if (!modelId || modelId.trim() === "") {
      throw new Error("GitMcpAgent: Model ID cannot be empty");
    }
    this.modelId = modelId;
  }

  /**
   * Sets the Google API key and initializes the provider
   * @param apiKey Google API key
   */
  setGoogleApiKey(apiKey: string): void {
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("GitMcpAgent: Google API key cannot be empty");
    }
    this.googleProvider = createGoogleGenerativeAI({ apiKey });
  }

  /**
   * Gets the configured model instance
   * @returns Google Generative AI model
   */
  private getModel(): any {
    if (!this.googleProvider) {
      throw new Error(
        "GitMcpAgent: Google provider not initialized. Call setGoogleApiKey first."
      );
    }
    if (!this.modelId) {
      throw new Error("GitMcpAgent: Model ID not set. Call setModel first.");
    }
    return this.googleProvider(this.modelId);
  }

  /**
   * Initializes the MCP client connection to GitHub MCP server
   */
  private async initializeMcpClient(): Promise<void> {
    if (this.mcpClient) {
      return; // Already initialized
    }

    if (!this.githubPAT) {
      throw new Error("GitMcpAgent: GitHub PAT not set. Call setApiKey first.");
    }

    try {
      // Use readonly mode for safety - restricts to read-only operations
      // Available modes:
      // - /x/all - All toolsets
      // - /readonly - Default toolset, readonly
      // - /x/all/readonly - All toolsets, readonly
      const endpoint = "https://api.githubcopilot.com/mcp/x/all/readonly";

      console.log("🔗 [MCP-CONNECTION] Connecting to GitHub MCP Server");
      console.log("   Endpoint:", endpoint);
      console.log("   Mode: readonly (read-only operations)");

      // Create Streamable HTTP transport for GitHub's hosted MCP server
      // Note: GitHub MCP server requires Streamable HTTP transport (not SSE)
      // Headers must be passed via requestInit parameter
      const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
        requestInit: {
          headers: {
            Authorization: `Bearer ${this.githubPAT}`,
            "X-MCP-Readonly": "true", // Extra safety: header-based readonly mode
          },
        },
      });

      // Create MCP client
      this.mcpClient = new Client(
        {
          name: "github-mcp-agent",
          version: "1.0.0",
        },
        {
          capabilities: {},
        }
      );

      // Connect to the server
      await this.mcpClient.connect(transport);

      console.log(
        "✅ [MCP-CONNECTION] Connected successfully via Streamable HTTP transport"
      );
    } catch (error) {
      console.error("❌ [GIT-MCP] Failed to initialize MCP client:", error);

      // Provide helpful error message based on error type
      let errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (
        errorMessage.includes("401") ||
        errorMessage.includes("Unauthorized")
      ) {
        errorMessage = `Authentication failed (401). Please verify:
1. Your GitHub PAT is valid and not expired
2. Token has required scopes: repo, read:packages, read:org
3. You have access to GitHub Copilot
4. Token format is correct (ghp_xxx or github_pat_xxx)`;
      }

      throw new Error(
        `GitMcpAgent: Failed to connect to GitHub MCP server: ${errorMessage}`
      );
    }
  }

  /**
   * Closes the MCP client connection
   */
  private async closeMcpClient(): Promise<void> {
    if (this.mcpClient) {
      try {
        await this.mcpClient.close();
        this.mcpClient = undefined;
        console.log("✅ [GIT-MCP] MCP client closed successfully");
      } catch (error) {
        console.error("❌ [GIT-MCP] Error closing MCP client:", error);
      }
    }
  }

  /**
   * Convert MCP tools to AI SDK tools
   */
  private async getMCPToolsAsAISDKTools(): Promise<Record<string, any>> {
    if (!this.mcpClient) {
      throw new Error("MCP client not initialized");
    }

    const mcpTools = await this.mcpClient.listTools();
    const aiSdkTools: Record<string, any> = {};

    for (const mcpTool of mcpTools.tools) {
      // Convert MCP tool schema to Zod schema
      const parameters = mcpTool.inputSchema as any;
      let zodSchema = z.object({});

      if (parameters?.properties) {
        const shape: Record<string, any> = {};
        for (const [key, value] of Object.entries(parameters.properties)) {
          const prop = value as any;
          // Simple type conversion - extend as needed
          if (prop.type === "string") {
            shape[key] = z.string().describe(prop.description || "");
          } else if (prop.type === "number") {
            shape[key] = z.number().describe(prop.description || "");
          } else if (prop.type === "boolean") {
            shape[key] = z.boolean().describe(prop.description || "");
          } else {
            shape[key] = z.any().describe(prop.description || "");
          }

          // Handle optional fields
          if (!parameters.required?.includes(key)) {
            shape[key] = shape[key].optional();
          }
        }
        zodSchema = z.object(shape);
      }

      // Create AI SDK tool
      aiSdkTools[mcpTool.name] = tool({
        description: mcpTool.description || "",
        parameters: zodSchema,
        execute: async (args: any) => {
          try {
            console.log(`🔧 [MCP-TOOL-EXEC] Executing tool: ${mcpTool.name}`);
            console.log("   Received args:", JSON.stringify(args, null, 2));

            const result = await this.mcpClient?.callTool({
              name: mcpTool.name,
              arguments: args,
            });

            console.log(
              `✅ [MCP-TOOL-EXEC] Tool ${mcpTool.name} completed successfully`
            );
            return result.content;
          } catch (error) {
            console.error(
              `❌ [MCP-TOOL-EXEC] Error calling tool ${mcpTool.name}:`,
              error
            );
            throw error;
          }
        },
      } as any);
    }

    return aiSdkTools;
  }

  /**
   * Executes a GitHub operation via MCP tools
   * @param params Operation parameters
   * @returns Agent execution result
   */
  async execute(params: {
    input: string;
    userId?: string;
  }): Promise<AgentResult> {
    const { input, userId } = params;
    const correlationId = createCorrelationId();
    const tracker = new PerformanceTracker({
      correlation_id: correlationId,
      agent_type: AgentType.GIT_MCP_AGENT,
      operation_type: AgentOperationType.MCP_OPERATION,
      operation_category: AgentOperationCategory.TOOL_USE,
      user_id: userId,
    });

    console.log(`\n${"=".repeat(80)}`);
    console.log("🎯 [GIT-MCP-AGENT] EXECUTION START");
    console.log("=".repeat(80));
    console.log("📥 [USER-INPUT] Query received from Chat Agent:");
    console.log("   ", input);
    console.log("-".repeat(80));

    if (!input || input.trim() === "") {
      console.log("❌ [GIT-MCP-AGENT] Empty input error");

      await logAgentActivity({
        agent_type: AgentType.GIT_MCP_AGENT,
        operation_type: AgentOperationType.MCP_OPERATION,
        operation_category: AgentOperationCategory.TOOL_USE,
        correlation_id: correlationId,
        user_id: userId,
        success: false,
        duration_ms: tracker.getDuration(),
        error_message: "Empty input",
        operation_metadata: {
          query_length: 0,
          tool_calls_count: 0,
          mcp_connection_status: "not_attempted",
        },
      });

      return {
        output: "Error: Input query cannot be empty",
        success: false,
        error: "Empty input",
      };
    }

    try {
      // Initialize MCP client
      console.log(
        "🔧 [MCP-CLIENT] Initializing connection to GitHub MCP server..."
      );
      await this.initializeMcpClient();

      // Get MCP tools and convert to AI SDK tools
      console.log(
        "🔍 [MCP-CLIENT] Discovering available tools from MCP server..."
      );
      const tools = await this.getMCPToolsAsAISDKTools();
      const toolNames = Object.keys(tools);

      console.log("✅ [MCP-CLIENT] Tool discovery complete");
      console.log("📋 [MCP-CLIENT] Available tools count:", toolNames.length);
      console.log(
        "📋 [MCP-CLIENT] Tool names:",
        toolNames.slice(0, 10).join(", "),
        "..."
      );

      // Stream text with MCP tools
      console.log("🤖 [GEMINI-MODEL] Starting AI model execution...");
      console.log("🎛️  [GEMINI-MODEL] Model:", this.modelId);
      console.log("🎛️  [GEMINI-MODEL] Temperature: 0.3");
      console.log("🎛️  [GEMINI-MODEL] Max steps: 5");
      console.log(
        "📝 [GEMINI-MODEL] System prompt length:",
        this.config.systemPrompt.length,
        "chars"
      );
      console.log(
        "📝 [GEMINI-MODEL] User query:",
        input.substring(0, 100) + (input.length > 100 ? "..." : "")
      );
      console.log("-".repeat(80));

      const result = streamText({
        model: this.getModel(),
        system: this.config.systemPrompt,
        prompt: input,
        tools,
        maxSteps: 5, // Allow multi-step tool execution
        temperature: 0.3, // Lower temperature for more deterministic responses
        onFinish: async () => {
          // Clean up MCP client after execution
          console.log("🧹 [MCP-CLIENT] Cleaning up connection...");
          await this.closeMcpClient();
        },
      } as any);

      // Collect the response
      console.log("📡 [STREAM] Processing model output stream...");
      let fullOutput = "";
      let stepCount = 0;
      const toolCalls: Array<{
        toolName: string;
        args: Record<string, any>;
        result: any;
      }> = [];

      for await (const chunk of result.fullStream) {
        if (chunk.type === "text-delta") {
          const text = (chunk as any).text || "";
          fullOutput += text;
          // Log first few characters of each text chunk
          if (text.length > 0) {
            const preview = text.substring(0, 50).replace(/\n/g, "↵");
            console.log(
              "💬 [MODEL-OUTPUT] Text chunk:",
              preview + (text.length > 50 ? "..." : "")
            );
          }
        } else if (chunk.type === "tool-call") {
          stepCount++;
          console.log(`\n${"─".repeat(80)}`);
          console.log(
            `🔧 [TOOL-CALL] Step ${stepCount}: Model decided to call tool`
          );
          console.log("   Tool name:", chunk.toolName);
          const input = (chunk as any).input || {};
          const argsStr = JSON.stringify(input, null, 2);
          const formattedArgs = argsStr
            .split("\n")
            .map((line, i) => (i === 0 ? line : `              ${line}`))
            .join("\n");
          console.log("   Arguments:", formattedArgs);
          console.log("─".repeat(80));

          toolCalls.push({
            toolName: chunk.toolName,
            args: input,
            result: null, // Will be filled in by tool-result
          });
        } else if (chunk.type === "tool-result") {
          console.log("📥 [TOOL-RESULT] Received result from MCP server");
          const output = (chunk as any).output || {};
          const resultStr = JSON.stringify(output);
          const resultPreview = resultStr.substring(0, 200);
          console.log(
            "   Result preview:",
            resultPreview + (resultStr.length > 200 ? "..." : "")
          );
          console.log("   Result length:", resultStr.length, "chars");

          // Find the corresponding tool call and add the result
          const lastCall = toolCalls.at(-1);
          if (lastCall) {
            lastCall.result = output;
          }
        } else if (chunk.type === "start-step") {
          console.log(`\n🚀 [STEP-START] Model starting step ${stepCount + 1}`);
        } else if (chunk.type === "finish-step") {
          console.log(`✓ [STEP-FINISH] Step ${stepCount} completed`);
        }
      }

      console.log(`\n${"=".repeat(80)}`);
      console.log("✅ [GIT-MCP-AGENT] EXECUTION COMPLETE");
      console.log("=".repeat(80));
      console.log("📊 [SUMMARY] Total tool calls made:", toolCalls.length);
      console.log("📊 [SUMMARY] Total steps executed:", stepCount);
      console.log("📊 [SUMMARY] Output length:", fullOutput.length, "chars");

      if (toolCalls.length > 0) {
        console.log("📋 [SUMMARY] Tools used:");
        toolCalls.forEach((call, index) => {
          console.log(`   ${index + 1}. ${call.toolName}`);
          const argsStr = JSON.stringify(call.args || {});
          console.log(
            `      Args: ${argsStr.substring(0, 100)}${argsStr.length > 100 ? "..." : ""}`
          );
        });
      }
      console.log(`${"=".repeat(80)}\n`);

      const finalOutput =
        fullOutput.trim() || "Operation completed successfully";

      console.log("📤 [RETURN-TO-CHAT] Sending response back to Chat Agent:");
      console.log("   Output length:", finalOutput.length, "chars");
      console.log(
        "   First 200 chars:",
        finalOutput.substring(0, 200) + (finalOutput.length > 200 ? "..." : "")
      );

      // Log successful MCP operation
      await logAgentActivity({
        agent_type: AgentType.GIT_MCP_AGENT,
        operation_type: AgentOperationType.MCP_OPERATION,
        operation_category: AgentOperationCategory.TOOL_USE,
        correlation_id: correlationId,
        user_id: userId,
        success: true,
        duration_ms: tracker.getDuration(),
        operation_metadata: {
          query_length: input.length,
          tool_calls_count: toolCalls.length,
          mcp_connection_status: "connected",
          output_length: finalOutput.length,
          tools_used: toolCalls.map((tc) => tc.toolName).join(", "),
        },
      });

      return {
        output: finalOutput,
        success: true,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    } catch (error) {
      console.error(`\n${"=".repeat(80)}`);
      console.error("❌ [GIT-MCP-AGENT] EXECUTION ERROR");
      console.error("=".repeat(80));
      console.error("Error details:", error);
      console.error(`${"=".repeat(80)}\n`);

      // Clean up on error
      await this.closeMcpClient();

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Log MCP operation failure
      await logAgentActivity({
        agent_type: AgentType.GIT_MCP_AGENT,
        operation_type: AgentOperationType.MCP_OPERATION,
        operation_category: AgentOperationCategory.TOOL_USE,
        correlation_id: correlationId,
        user_id: userId,
        success: false,
        duration_ms: tracker.getDuration(),
        error_message: errorMessage,
        operation_metadata: {
          query_length: input.length,
          tool_calls_count: 0,
          mcp_connection_status: "error",
        },
      });

      return {
        output: `Error executing GitHub operation: ${errorMessage}`,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Gets the agent configuration
   * @returns Agent configuration
   */
  getConfig(): GitMcpAgentConfig {
    return this.config;
  }

  /**
   * Checks if the agent is properly configured
   * @returns True if agent is ready to use
   */
  isReady(): boolean {
    return !!(
      this.config &&
      this.githubPAT &&
      this.modelId &&
      this.googleProvider
    );
  }
}
