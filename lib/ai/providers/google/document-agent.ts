import "server-only";

import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import type { UIMessageStreamWriter } from "ai";
import { z } from "zod";
import type { DocumentAgentConfig } from "../../core/types";
import type { ChatMessage } from "@/lib/types";
import { createTextDocument } from "../../tools/document/createTextDocument";
import { updateTextDocument } from "../../tools/document/updateTextDocument";
import { createSheetDocument } from "../../tools/document/createSheetDocument";
import { updateSheetDocument } from "../../tools/document/updateSheetDocument";

/**
 * GoogleDocumentAgent - Specialized agent for document and spreadsheet operations
 * This agent is only called by the Chat Agent when document/sheet operations are needed
 * Implements four core tools: createDocumentArtifact, updateDocumentArtifact, createSheetArtifact, updateSheetArtifact
 */
export class GoogleDocumentAgent {
  private apiKey?: string;
  private googleProvider?: ReturnType<typeof createGoogleGenerativeAI>;
  private modelId?: string;

  constructor(private config: DocumentAgentConfig) {
    this.validateConfig();
  }

  /**
   * Set the Google API key for this agent instance
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.googleProvider = createGoogleGenerativeAI({
      apiKey: apiKey,
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
      throw new Error("GoogleDocumentAgent: Model ID not set. Call setModel() before using tools.");
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
      throw new Error("GoogleDocumentAgent: Configuration is required");
    }

    if (!this.config.enabled) {
      throw new Error("GoogleDocumentAgent: Agent is disabled");
    }
  }

  /**
   * Execute document agent with input and return output
   * This is the main method called by Chat Agent
   */
  async execute(params: {
    input: string;
    dataStream: UIMessageStreamWriter<ChatMessage>;
    user?: any;
  }): Promise<{ output: string; success: boolean; toolCalls?: any[]; reasoning?: string }> {
    const { input, dataStream, user } = params;

    try {
      const model = this.getModel();

      // Build tools for this agent
      const tools = this.buildTools(dataStream, user);

      console.log('📄 [DOCUMENT-AGENT] Starting with tools:', Object.keys(tools));

      // Track tool results from callbacks
      const collectedToolCalls: any[] = [];

      // Configure with Google-specific thinking support
      const config: any = {
        model,
        system: this.config.systemPrompt,
        prompt: input,
        tools,
        temperature: 0.7,
        onStepFinish: async (event: any) => {
          console.log('📄 [DOCUMENT-AGENT] onStepFinish event keys:', Object.keys(event));
          console.log('📄 [DOCUMENT-AGENT] onStepFinish - toolResults:', event.toolResults?.length || 0);
          console.log('📄 [DOCUMENT-AGENT] onStepFinish - toolCalls:', event.toolCalls?.length || 0);

          // Try toolResults first
          if (event.toolResults) {
            for (const tr of event.toolResults) {
              //console.log('📄 [DOCUMENT-AGENT] Tool result (from toolResults):', JSON.stringify(tr, null, 2));
              collectedToolCalls.push({
                toolName: tr.toolName,
                args: tr.input,
                result: tr.output,  // Use output instead of result!
              });
            }
          }

          // Also check toolCalls
          if (event.toolCalls) {
            for (const tc of event.toolCalls) {
              console.log('📄 [DOCUMENT-AGENT] Tool call (from toolCalls):', JSON.stringify(tc, null, 2));
            }
          }
        },
      };

      // Enable thinking mode for delegated agent if supported
      if (this.modelId?.includes('thinking')) {
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
      let fullOutput = '';
      for await (const chunk of result.textStream) {
        fullOutput += chunk;
      }

      // Get the final result to access reasoning
      const finalResult = await result;
      const reasoning = await finalResult.reasoning;

      // Use collected tool calls from onStepFinish callback
      const toolCalls = collectedToolCalls;

      console.log('✅ [DOCUMENT-AGENT] Completed execution');
      console.log('📄 [DOCUMENT-AGENT] Text output length:', fullOutput.length);
      console.log('📄 [DOCUMENT-AGENT] Tool calls executed:', toolCalls?.length || 0);

      // Log tool call details with FULL structure
      if (toolCalls && toolCalls.length > 0) {
        toolCalls.forEach((call: any, index: number) => {
          console.log(`📄 [DOCUMENT-AGENT] Tool ${index + 1}:`, call.toolName);
          console.log(`📄 [DOCUMENT-AGENT] Tool ${index + 1} result:`, JSON.stringify(call.result, null, 2));
          if (call.args) {
            const argsStr = JSON.stringify(call.args);
            console.log(`📄 [DOCUMENT-AGENT] Tool ${index + 1} args:`, argsStr.substring(0, 200));
          }
        });
      }

      // When tools are executed, the text output is usually empty
      // The tool itself handles streaming to the UI via dataStream
      // Return the structured tool result directly for proper handling
      let output: any = fullOutput || 'Document operation completed successfully.';

      // If we have tool calls, return the structured result from the first tool
      // This allows the chat agent to properly create document preview parts
      if (toolCalls && toolCalls.length > 0) {
        const firstToolCall = toolCalls[0];
        if (firstToolCall.result && typeof firstToolCall.result === 'object') {
          // Return the structured object (id, title, kind)
          output = firstToolCall.result;
          console.log('📄 [DOCUMENT-AGENT] Returning structured tool result:', JSON.stringify(output));
        } else if (firstToolCall.result) {
          output = firstToolCall.result;
          console.log('📄 [DOCUMENT-AGENT] Returning string tool result:', output);
        }
      }

      return {
        output,
        success: true,
        toolCalls: toolCalls || [],
        reasoning: reasoning?.map(r => r.text || '').join('\n') || undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      console.error('❌ [DOCUMENT-AGENT] Execution failed:', errorMessage);

      return {
        output: `Error: ${errorMessage}`,
        success: false,
      };
    }
  }

  /**
   * Build the tools available to this agent
   * Integrates with existing artifact handlers
   */
  private buildTools(dataStream: UIMessageStreamWriter<ChatMessage>, user?: any): Record<string, any> {
    const tools: Record<string, any> = {};

    // Create Document Artifact Tool
    if (this.config.tools?.createDocumentArtifact?.enabled) {
      tools.createDocumentArtifact = tool({
        description: this.config.tools.createDocumentArtifact.description,
        inputSchema: z.object({
          title: z.string().describe("Title for the document"),
          content: z.string().describe("The content for the document in markdown format")
        }),
        execute: async (params: { title: string; content: string }) => {
          try {
            console.log('📝 [CREATE-DOC] Creating document:', params.title);
            console.log('📝 [CREATE-DOC] Content length:', params.content.length);

            const documentId = await createTextDocument({
              title: params.title,
              content: params.content,
              dataStream,
              user: user || null
            });

            console.log('✅ [CREATE-DOC] Document created with ID:', documentId);

            // Return structured data instead of string - AI SDK will handle this properly
            const toolResult = {
              id: documentId,
              title: params.title,
              kind: 'text',
            };

            console.log('📝 [CREATE-DOC] Returning tool result:', JSON.stringify(toolResult));

            return toolResult;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ [CREATE-DOC] Failed:', errorMessage);
            return { error: errorMessage };
          }
        }
      });
    }

    // Update Document Artifact Tool
    if (this.config.tools?.updateDocumentArtifact?.enabled) {
      tools.updateDocumentArtifact = tool({
        description: this.config.tools.updateDocumentArtifact.description,
        inputSchema: z.object({
          documentId: z.string().describe("ID of the document to update"),
          content: z.string().describe("The updated content for the document")
        }),
        execute: async (params: { documentId: string; content: string }) => {
          try {
            const documentId = await updateTextDocument({
              documentId: params.documentId,
              content: params.content,
              dataStream,
              user: user || null
            });

            return `Updated document: ${params.documentId}`;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ [DOCUMENT-AGENT] Update document failed:', errorMessage);
            return `Error updating document: ${errorMessage}`;
          }
        }
      });
    }

    // Create Sheet Artifact Tool
    if (this.config.tools?.createSheetArtifact?.enabled) {
      tools.createSheetArtifact = tool({
        description: this.config.tools.createSheetArtifact.description,
        inputSchema: z.object({
          title: z.string().describe("Title for the spreadsheet"),
          csvData: z.string().describe("CSV data for the spreadsheet")
        }),
        execute: async (params: { title: string; csvData: string }) => {
          try {
            const sheetId = await createSheetDocument({
              title: params.title,
              csvData: params.csvData,
              dataStream,
              user: user || null
            });

            return `Created spreadsheet: ${params.title} (ID: ${sheetId})`;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ [DOCUMENT-AGENT] Create sheet failed:', errorMessage);
            return `Error creating spreadsheet: ${errorMessage}`;
          }
        }
      });
    }

    // Update Sheet Artifact Tool
    if (this.config.tools?.updateSheetArtifact?.enabled) {
      tools.updateSheetArtifact = tool({
        description: this.config.tools.updateSheetArtifact.description,
        inputSchema: z.object({
          sheetId: z.string().describe("ID of the spreadsheet to update"),
          csvData: z.string().describe("The updated CSV data for the spreadsheet")
        }),
        execute: async (params: { sheetId: string; csvData: string }) => {
          try {
            const sheetId = await updateSheetDocument({
              sheetId: params.sheetId,
              csvData: params.csvData,
              dataStream,
              user: user || null
            });

            return `Updated spreadsheet: ${params.sheetId}`;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ [DOCUMENT-AGENT] Update sheet failed:', errorMessage);
            return `Error updating spreadsheet: ${errorMessage}`;
          }
        }
      });
    }

    return tools;
  }
}