import "server-only";

import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { streamText } from "ai";
import {
  AgentOperationCategory,
  AgentOperationType,
  AgentType,
  createCorrelationId,
  PerformanceTracker,
} from "@/lib/logging/activity-logger";
import type { ProviderToolsAgentConfig } from "../../core/types";

/**
 * GoogleProviderToolsAgent - Standalone agent for external services
 * This agent is only called by the Chat Agent when external tools are needed
 * Implements Google Search, URL Context, and Code Execution tools
 */
export class GoogleProviderToolsAgent {
  private googleProvider?: ReturnType<typeof createGoogleGenerativeAI>;
  private modelId?: string;

  constructor(private readonly config: ProviderToolsAgentConfig) {
    this.validateConfig();
  }

  /**
   * Set the Google API key for this agent instance
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.googleProvider = createGoogleGenerativeAI({
      apiKey,
    });
  }

  /**
   * Set the model ID to use for tool execution
   * This should be the same model as the chat agent
   */
  setModel(modelId: string): void {
    this.modelId = modelId;
  }

  /**
   * Get the Google model instance for this agent
   */
  private getModel() {
    if (!this.modelId) {
      throw new Error(
        "GoogleProviderToolsAgent: Model ID not set. Call setModel() before using tools."
      );
    }

    if (this.googleProvider) {
      return this.googleProvider(this.modelId);
    }

    // Fallback to environment variable if no API key is set
    return google(this.modelId);
  }

  /**
   * Validate agent configuration
   */
  private validateConfig(): void {
    if (!this.config) {
      throw new Error("GoogleProviderToolsAgent: Configuration is required");
    }

    if (!this.config.enabled) {
      throw new Error("GoogleProviderToolsAgent: Agent is disabled");
    }
  }

  /**
   * Execute provider tools agent with input and return output
   * This is the main method called by Chat Agent
   * Uses generateText for proper tool integration with AI SDK v5
   */
  async execute(params: { input: string; userId?: string }): Promise<{
    output: string;
    success: boolean;
    toolCalls?: any[];
    reasoning?: string;
  }> {
    const { input, userId } = params;
    const correlationId = createCorrelationId();
    const tracker = new PerformanceTracker({
      correlation_id: correlationId,
      agent_type: AgentType.PROVIDER_TOOLS_AGENT,
      operation_type: AgentOperationType.TOOL_INVOCATION,
      operation_category: AgentOperationCategory.TOOL_USE,
      user_id: userId,
    });

    try {
      const model = this.getModel();

      // Build tools for this agent
      const tools = this.buildTools();

      console.log(
        "🔧 [PROVIDER-TOOLS] Starting with tools:",
        Object.keys(tools)
      );

      // Configure with Google-specific thinking support
      const config: any = {
        model,
        system: this.config.systemPrompt,
        prompt: input,
        tools,
        temperature: 0.7,
      };

      // Enable thinking mode for delegated agent if supported
      if (this.modelId?.includes("thinking")) {
        config.providerOptions = {
          google: {
            thinkingConfig: {
              thinkingBudget: 4096,
              includeThoughts: true,
            },
          },
        };
      }

      // Use streamText to get full result with tool calls and reasoning
      const result = streamText(config);

      // Collect the full text output
      let fullOutput = "";
      for await (const chunk of result.textStream) {
        fullOutput += chunk;
      }

      // Get the final result to access tool calls and reasoning
      const finalResult = await result;
      const toolCalls = await finalResult.toolCalls;
      const reasoning = await finalResult.reasoning;

      console.log(
        "✅ [PROVIDER-TOOLS] Completed execution, output length:",
        fullOutput.length
      );
      console.log(
        "🔧 [PROVIDER-TOOLS] Tool calls executed:",
        toolCalls?.length || 0
      );

      // Determine thinking mode from modelId
      const thinkingMode = this.modelId?.includes("thinking") || false;

      // Log successful provider tools execution
      await tracker.end({
        success: true,
        operation_metadata: {
          query_length: input.length,
          tools_enabled: Object.keys(this.buildTools()).join(", "),
          thinking_mode: thinkingMode,
          output_length: fullOutput.length,
          tool_calls_count: toolCalls?.length || 0,
        },
      });

      return {
        output: fullOutput,
        success: true,
        toolCalls: toolCalls || [],
        reasoning: reasoning?.map((r) => r.text || "").join("\n") || undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      console.error("❌ [PROVIDER-TOOLS] Execution failed:", errorMessage);

      // Log provider tools execution failure
      await tracker.end({
        success: false,
        error_message: errorMessage,
        operation_metadata: {
          query_length: input.length,
          tools_enabled: Object.keys(this.buildTools()).join(", "),
          thinking_mode: this.modelId?.includes("thinking") || false,
        },
      });

      return {
        output: `Error: ${errorMessage}`,
        success: false,
      };
    }
  }

  /**
   * Build the tools available to this agent
   * Using Google's native tools directly
   */
  private buildTools(): Record<string, any> {
    const tools: Record<string, any> = {};

    // Google Search Tool - use Google's native tool
    if (this.config.tools?.googleSearch?.enabled) {
      tools.google_search = google.tools.googleSearch({});
    }

    // URL Context Tool - use Google's native tool
    if (this.config.tools?.urlContext?.enabled) {
      tools.url_context = google.tools.urlContext({});
    }

    // Code Execution Tool - use Google's native tool
    if (this.config.tools?.codeExecution?.enabled) {
      tools.code_execution = google.tools.codeExecution({});
    }

    return tools;
  }
}
