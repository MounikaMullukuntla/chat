import "server-only";

import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamObject } from "ai";
import type { UIMessageStreamWriter } from "ai";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";
// Simple agent config interface
interface AgentConfig {
  systemPrompt: string;
  enabled: boolean;
  tools?: Record<string, { description: string; enabled: boolean; }>;
}
import { saveDocument, getDocumentById } from "@/lib/db/queries/document";
import { generateUUID } from "@/lib/utils";

/**
 * GooglePythonAgent handles Python code artifacts
 * Uses streamObject with code schema validation
 * Supports line-range updates and code injection
 */
export class GooglePythonAgent {
  private apiKey?: string;
  private googleProvider?: ReturnType<typeof createGoogleGenerativeAI>;

  constructor(private config: AgentConfig) {
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
   * Get the Google model instance for this agent
   */
  private getModel() {
    if (this.googleProvider) {
      return this.googleProvider(this.config.model);
    }
    
    // Fallback to environment variable if no API key is set
    return google(this.config.model);
  }

  /**
   * Validate agent configuration
   */
  private validateConfig(): void {
    if (!this.config) {
      throw new Error("GooglePythonAgent: Configuration is required");
    }

    if (!this.config.enabled) {
      throw new Error("GooglePythonAgent: Agent is disabled");
    }

    if (!this.config.systemPrompt) {
      throw new Error("GooglePythonAgent: System prompt is required");
    }

    if (!this.config.model) {
      throw new Error("GooglePythonAgent: Model is required");
    }
  }

  /**
   * Create a new Python code artifact by generating content with the AI model
   */
  async createCode(params: {
    title: string;
    prompt: string;
    dataStream: UIMessageStreamWriter;
    user: User;
    chatId: string;
  }): Promise<{ documentId: string; content: string }> {
    const { title, prompt, dataStream, user, chatId } = params;
    
    try {
      const documentId = generateUUID();
      
      // Write initial metadata to stream
      dataStream.write({
        type: 'data-id',
        data: documentId,
      });

      dataStream.write({
        type: 'data-title',
        data: title,
      });

      dataStream.write({
        type: 'data-kind',
        data: 'code',
      });

      let generatedCode = '';

      // Use streamObject for structured Python code generation
      const { partialObjectStream } = await streamObject({
        model: this.getModel(),
        system: this.config.systemPrompt,
        prompt: prompt,
        schema: z.object({
          code: z.string().describe('Complete Python code that is executable and well-commented'),
        }),
      });

      for await (const partialObject of partialObjectStream) {
        if (partialObject.code) {
          const delta = partialObject.code.slice(generatedCode.length);
          if (delta) {
            generatedCode = partialObject.code;
            dataStream.write({
              type: 'data-codeDelta',
              data: delta,
            });
          }
        }
      }

      // Save code artifact to database with version control
      await saveDocument({
        id: documentId,
        title,
        kind: 'code',
        content: generatedCode,
        userId: user.id,
        chatId,
        metadata: {
          agent: 'GooglePythonAgent',
          method: 'createCode',
          generatedAt: new Date().toISOString(),
        },
      });

      return {
        documentId,
        content: generatedCode,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      dataStream.write({
        type: 'error',
        errorText: `Failed to create Python code: ${errorMessage}`,
      });

      throw new Error(`GooglePythonAgent.createCode failed: ${errorMessage}`);
    }
  }

  /**
   * Inject pre-written Python code directly into a new artifact
   */
  async injectCode(params: {
    title: string;
    content: string;
    dataStream: UIMessageStreamWriter;
    user: User;
    chatId: string;
  }): Promise<{ documentId: string; content: string }> {
    const { title, content, dataStream, user, chatId } = params;
    
    try {
      const documentId = generateUUID();
      
      // Write metadata to stream
      dataStream.write({
        type: 'data-id',
        data: documentId,
      });

      dataStream.write({
        type: 'data-title',
        data: title,
      });

      dataStream.write({
        type: 'data-kind',
        data: 'code',
      });

      // Stream the pre-written code
      dataStream.write({
        type: 'data-codeDelta',
        data: content,
      });

      // Save code artifact to database
      await saveDocument({
        id: documentId,
        title,
        kind: 'code',
        content,
        userId: user.id,
        chatId,
        metadata: {
          agent: 'GooglePythonAgent',
          method: 'injectCode',
          injectedAt: new Date().toISOString(),
        },
      });

      return {
        documentId,
        content,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      dataStream.write({
        type: 'error',
        errorText: `Failed to inject Python code: ${errorMessage}`,
      });

      throw new Error(`GooglePythonAgent.injectCode failed: ${errorMessage}`);
    }
  }

  /**
   * Update an existing Python code artifact with new content or modifications
   */
  async updateCode(params: {
    documentId: string;
    updatePrompt: string;
    isPreGenerated: boolean;
    lineRange?: { start: number; end: number };
    dataStream: UIMessageStreamWriter;
    user: User;
    chatId: string;
  }): Promise<{ documentId: string; content: string }> {
    const { documentId, updatePrompt, isPreGenerated, lineRange, dataStream, user, chatId } = params;
    
    try {
      // Get the current code document
      const currentDocument = await getDocumentById({ id: documentId });
      if (!currentDocument) {
        throw new Error(`Code document with id ${documentId} not found`);
      }

      // Write metadata to stream
      dataStream.write({
        type: 'data-id',
        data: documentId,
      });

      dataStream.write({
        type: 'data-title',
        data: currentDocument.title || 'Untitled Code',
      });

      dataStream.write({
        type: 'data-kind',
        data: 'code',
      });

      let updatedContent: string;

      if (isPreGenerated) {
        // Use pre-generated content directly
        if (lineRange) {
          // Apply line-range update
          updatedContent = this.applyLineRangeUpdate(
            currentDocument.content || '',
            updatePrompt,
            lineRange
          );
        } else {
          // Full content replacement
          updatedContent = updatePrompt;
        }

        // Stream the updated code
        dataStream.write({
          type: 'data-codeDelta',
          data: updatedContent,
        });
      } else {
        // Generate updated code using AI
        const systemPrompt = lineRange 
          ? `${this.config.systemPrompt}\n\nYou are updating a specific section of Python code. Focus only on the requested changes while maintaining code functionality.`
          : this.config.systemPrompt;

        const prompt = `Current Python code:\n\`\`\`python\n${currentDocument.content || ''}\n\`\`\`\n\nUpdate instructions: ${updatePrompt}`;

        updatedContent = '';

        // Use streamObject for structured code updates
        const { partialObjectStream } = await streamObject({
          model: this.getModel(),
          system: systemPrompt,
          prompt: prompt,
          schema: z.object({
            code: z.string().describe('Updated Python code that is executable and well-commented'),
          }),
        });

        for await (const partialObject of partialObjectStream) {
          if (partialObject.code) {
            const delta = partialObject.code.slice(updatedContent.length);
            if (delta) {
              updatedContent = partialObject.code;
              dataStream.write({
                type: 'data-codeDelta',
                data: delta,
              });
            }
          }
        }

        // Apply line-range update if specified
        if (lineRange) {
          updatedContent = this.applyLineRangeUpdate(
            currentDocument.content || '',
            updatedContent,
            lineRange
          );
        }
      }

      // Save updated code as new version with parent relationship
      await saveDocument({
        id: documentId,
        title: currentDocument.title || 'Untitled Code',
        kind: 'code',
        content: updatedContent,
        userId: user.id,
        chatId,
        parentVersionId: currentDocument.id,
        metadata: {
          agent: 'GooglePythonAgent',
          method: 'updateCode',
          isPreGenerated,
          lineRange,
          updatedAt: new Date().toISOString(),
          updateType: lineRange ? 'partial' : 'full',
        },
      });

      return {
        documentId,
        content: updatedContent,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      dataStream.write({
        type: 'error',
        errorText: `Failed to update Python code: ${errorMessage}`,
      });

      throw new Error(`GooglePythonAgent.updateCode failed: ${errorMessage}`);
    }
  }

  /**
   * Apply line-range update to existing code content
   */
  private applyLineRangeUpdate(
    originalContent: string,
    newContent: string,
    lineRange: { start: number; end: number }
  ): string {
    const lines = originalContent.split('\n');
    const newLines = newContent.split('\n');
    
    // Validate line range
    const startIndex = Math.max(0, lineRange.start - 1); // Convert to 0-based index
    const endIndex = Math.min(lines.length - 1, lineRange.end - 1);
    
    if (startIndex > endIndex) {
      throw new Error('Invalid line range: start line must be less than or equal to end line');
    }
    
    // Replace the specified line range with new content
    const beforeLines = lines.slice(0, startIndex);
    const afterLines = lines.slice(endIndex + 1);
    
    return [...beforeLines, ...newLines, ...afterLines].join('\n');
  }
}