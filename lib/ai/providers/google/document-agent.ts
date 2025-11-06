import "server-only";

import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, streamObject } from "ai";
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
import { getSheetPrompt, getUpdateDocumentPrompt } from "../../prompts";

/**
 * GoogleDocumentAgent handles text documents and spreadsheets
 * Supports both content generation and injection modes
 * Implements line-range updates and version control
 */
export class GoogleDocumentAgent {
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
      throw new Error("GoogleDocumentAgent: Configuration is required");
    }

    if (!this.config.enabled) {
      throw new Error("GoogleDocumentAgent: Agent is disabled");
    }

    if (!this.config.systemPrompt) {
      throw new Error("GoogleDocumentAgent: System prompt is required");
    }

    if (!this.config.model) {
      throw new Error("GoogleDocumentAgent: Model is required");
    }
  }

  /**
   * Create a new document by generating content with the AI model
   */
  async createDocument(params: {
    title: string;
    prompt: string;
    kind: 'text' | 'sheet';
    dataStream: UIMessageStreamWriter;
    user: User;
    chatId: string;
  }): Promise<{ documentId: string; content: string }> {
    const { title, prompt, kind, dataStream, user, chatId } = params;
    
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
        data: kind,
      });

      let generatedContent = '';

      if (kind === 'sheet') {
        // Use streamObject for structured spreadsheet generation
        const { partialObjectStream } = await streamObject({
          model: this.getModel(),
          system: this.config.systemPrompt,
          prompt: `${sheetPrompt}\n\n${prompt}`,
          schema: z.object({
            content: z.string().describe('CSV formatted spreadsheet content with headers'),
          }),
        });

        for await (const partialObject of partialObjectStream) {
          if (partialObject.content) {
            const delta = partialObject.content.slice(generatedContent.length);
            if (delta) {
              generatedContent = partialObject.content;
              dataStream.write({
                type: 'data-sheetDelta',
                data: delta,
              });
            }
          }
        }
      } else {
        // Use streamText for text documents
        const { textStream } = await streamText({
          model: this.getModel(),
          system: this.config.systemPrompt,
          prompt: prompt,
        });

        for await (const delta of textStream) {
          generatedContent += delta;
          dataStream.write({
            type: 'data-textDelta',
            data: delta,
          });
        }
      }

      // Save document to database with version control
      await saveDocument({
        id: documentId,
        title,
        kind,
        content: generatedContent,
        userId: user.id,
        chatId,
        metadata: {
          agent: 'GoogleDocumentAgent',
          method: 'createDocument',
          generatedAt: new Date().toISOString(),
        },
      });

      return {
        documentId,
        content: generatedContent,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      dataStream.write({
        type: 'error',
        errorText: `Failed to create document: ${errorMessage}`,
      });

      throw new Error(`GoogleDocumentAgent.createDocument failed: ${errorMessage}`);
    }
  }

  /**
   * Inject pre-generated content directly into a new document
   */
  async injectDocument(params: {
    title: string;
    content: string;
    kind: 'text' | 'sheet';
    dataStream: UIMessageStreamWriter;
    user: User;
    chatId: string;
  }): Promise<{ documentId: string; content: string }> {
    const { title, content, kind, dataStream, user, chatId } = params;
    
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
        data: kind,
      });

      // Stream the pre-generated content
      const deltaType = kind === 'sheet' ? 'data-sheetDelta' : 'data-textDelta';
      dataStream.write({
        type: deltaType,
        data: content,
      });

      // Save document to database
      await saveDocument({
        id: documentId,
        title,
        kind,
        content,
        userId: user.id,
        chatId,
        metadata: {
          agent: 'GoogleDocumentAgent',
          method: 'injectDocument',
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
        errorText: `Failed to inject document: ${errorMessage}`,
      });

      throw new Error(`GoogleDocumentAgent.injectDocument failed: ${errorMessage}`);
    }
  }

  /**
   * Update an existing document with new content or modifications
   */
  async updateDocument(params: {
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
      // Get the current document
      const currentDocument = await getDocumentById({ id: documentId });
      if (!currentDocument) {
        throw new Error(`Document with id ${documentId} not found`);
      }

      // Write metadata to stream
      dataStream.write({
        type: 'data-id',
        data: documentId,
      });

      dataStream.write({
        type: 'data-title',
        data: currentDocument.title || 'Untitled Document',
      });

      dataStream.write({
        type: 'data-kind',
        data: currentDocument.kind,
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

        // Stream the updated content
        const deltaType = currentDocument.kind === 'sheet' ? 'data-sheetDelta' : 'data-textDelta';
        dataStream.write({
          type: deltaType,
          data: updatedContent,
        });
      } else {
        // Generate updated content using AI
        const systemPrompt = lineRange 
          ? `${this.config.systemPrompt}\n\nYou are updating a specific section of a document. Focus only on the requested changes.`
          : this.config.systemPrompt;

        const fullPrompt = updateDocumentPrompt(currentDocument.content || '', currentDocument.kind as any);
        const prompt = `${fullPrompt}\n\nUpdate instructions: ${updatePrompt}`;

        updatedContent = '';

        if (currentDocument.kind === 'sheet') {
          // Use streamObject for structured spreadsheet updates
          const { partialObjectStream } = await streamObject({
            model: this.getModel(),
            system: systemPrompt,
            prompt: prompt,
            schema: z.object({
              content: z.string().describe('Updated CSV formatted spreadsheet content'),
            }),
          });

          for await (const partialObject of partialObjectStream) {
            if (partialObject.content) {
              const delta = partialObject.content.slice(updatedContent.length);
              if (delta) {
                updatedContent = partialObject.content;
                dataStream.write({
                  type: 'data-sheetDelta',
                  data: delta,
                });
              }
            }
          }
        } else {
          // Use streamText for text documents
          const { textStream } = await streamText({
            model: this.getModel(),
            system: systemPrompt,
            prompt: prompt,
          });

          for await (const delta of textStream) {
            updatedContent += delta;
            dataStream.write({
              type: 'data-textDelta',
              data: delta,
            });
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

      // Save updated document as new version with parent relationship
      await saveDocument({
        id: documentId,
        title: currentDocument.title || 'Untitled Document',
        kind: currentDocument.kind as 'text' | 'sheet' | 'code' | 'image',
        content: updatedContent,
        userId: user.id,
        chatId,
        parentVersionId: currentDocument.id,
        metadata: {
          agent: 'GoogleDocumentAgent',
          method: 'updateDocument',
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
        errorText: `Failed to update document: ${errorMessage}`,
      });

      throw new Error(`GoogleDocumentAgent.updateDocument failed: ${errorMessage}`);
    }
  }

  /**
   * Apply line-range update to existing content
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