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
 * GoogleMermaidAgent handles Mermaid diagram artifacts
 * Uses streamObject with diagram schema validation
 * Supports line-range updates and diagram injection
 */
export class GoogleMermaidAgent {
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
      throw new Error("GoogleMermaidAgent: Configuration is required");
    }

    if (!this.config.enabled) {
      throw new Error("GoogleMermaidAgent: Agent is disabled");
    }

    if (!this.config.systemPrompt) {
      throw new Error("GoogleMermaidAgent: System prompt is required");
    }

    if (!this.config.model) {
      throw new Error("GoogleMermaidAgent: Model is required");
    }
  }

  /**
   * Validate Mermaid syntax (basic validation)
   */
  private validateMermaidSyntax(diagram: string): boolean {
    const trimmed = diagram.trim();
    
    // Check for common Mermaid diagram types
    const validTypes = [
      'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 
      'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie',
      'gitgraph', 'mindmap', 'timeline', 'sankey'
    ];
    
    const firstLine = trimmed.split('\n')[0].toLowerCase();
    const hasValidType = validTypes.some(type => 
      firstLine.includes(type.toLowerCase())
    );
    
    // Basic syntax checks
    const hasContent = trimmed.length > 0;
    const notEmpty = trimmed !== '';
    
    return hasValidType && hasContent && notEmpty;
  }

  /**
   * Create a new Mermaid diagram artifact by generating content with the AI model
   */
  async createDiagram(params: {
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

      let generatedDiagram = '';

      // Use streamObject for structured Mermaid diagram generation
      const { partialObjectStream } = streamObject({
        model: this.getModel(),
        system: this.config.systemPrompt,
        prompt: prompt,
        schema: z.object({
          diagram: z.string().describe('Complete Mermaid diagram with valid syntax and proper formatting'),
        }),
      });

      for await (const partialObject of partialObjectStream) {
        if (partialObject.diagram) {
          const delta = partialObject.diagram.slice(generatedDiagram.length);
          if (delta) {
            generatedDiagram = partialObject.diagram;
            dataStream.write({
              type: 'data-codeDelta',
              data: delta,
            });
          }
        }
      }

      // Validate Mermaid syntax before saving
      if (!this.validateMermaidSyntax(generatedDiagram)) {
        throw new Error('Generated diagram does not contain valid Mermaid syntax');
      }

      // Save diagram artifact to database with version control
      await saveDocument({
        id: documentId,
        title,
        kind: 'mermaid code',
        content: generatedDiagram,
        userId: user.id,
        chatId,
        metadata: {
          agent: 'GoogleMermaidAgent',
          method: 'createDiagram',
          generatedAt: new Date().toISOString(),
        },
      });

      return {
        documentId,
        content: generatedDiagram,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      dataStream.write({
        type: 'error',
        errorText: `Failed to create Mermaid diagram: ${errorMessage}`,
      });

      throw new Error(`GoogleMermaidAgent.createDiagram failed: ${errorMessage}`);
    }
  }

  /**
   * Inject pre-written Mermaid diagram directly into a new artifact
   */
  async injectDiagram(params: {
    title: string;
    content: string;
    dataStream: UIMessageStreamWriter;
    user: User;
    chatId: string;
  }): Promise<{ documentId: string; content: string }> {
    const { title, content, dataStream, user, chatId } = params;
    
    try {
      // Validate Mermaid syntax before injection
      if (!this.validateMermaidSyntax(content)) {
        throw new Error('Provided diagram does not contain valid Mermaid syntax');
      }

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

      // Stream the pre-written diagram
      dataStream.write({
        type: 'data-codeDelta',
        data: content,
      });

      // Save diagram artifact to database
      await saveDocument({
        id: documentId,
        title,
        kind: 'code',
        content,
        userId: user.id,
        chatId,
        metadata: {
          agent: 'GoogleMermaidAgent',
          method: 'injectDiagram',
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
        errorText: `Failed to inject Mermaid diagram: ${errorMessage}`,
      });

      throw new Error(`GoogleMermaidAgent.injectDiagram failed: ${errorMessage}`);
    }
  }

  /**
   * Update an existing Mermaid diagram artifact with new content or modifications
   */
  async updateDiagram(params: {
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
      // Get the current diagram document
      const currentDocument = await getDocumentById({ id: documentId });
      if (!currentDocument) {
        throw new Error(`Mermaid diagram with id ${documentId} not found`);
      }

      // Write metadata to stream
      dataStream.write({
        type: 'data-id',
        data: documentId,
      });

      dataStream.write({
        type: 'data-title',
        data: currentDocument.title || 'Untitled Diagram',
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

        // Validate Mermaid syntax before proceeding
        if (!this.validateMermaidSyntax(updatedContent)) {
          throw new Error('Updated diagram does not contain valid Mermaid syntax');
        }

        // Stream the updated diagram
        dataStream.write({
          type: 'data-codeDelta',
          data: updatedContent,
        });
      } else {
        // Generate updated diagram using AI
        const systemPrompt = lineRange 
          ? `${this.config.systemPrompt}\n\nYou are updating a specific section of a Mermaid diagram. Focus only on the requested changes while maintaining diagram structure and syntax.`
          : this.config.systemPrompt;

        const prompt = `Current Mermaid diagram:\n\`\`\`mermaid\n${currentDocument.content || ''}\n\`\`\`\n\nUpdate instructions: ${updatePrompt}`;

        updatedContent = '';

        // Use streamObject for structured diagram updates
        const { partialObjectStream } = streamObject({
          model: this.getModel(),
          system: systemPrompt,
          prompt: prompt,
          schema: z.object({
            diagram: z.string().describe('Updated Mermaid diagram with valid syntax and proper formatting'),
          }),
        });

        for await (const partialObject of partialObjectStream) {
          if (partialObject.diagram) {
            const delta = partialObject.diagram.slice(updatedContent.length);
            if (delta) {
              updatedContent = partialObject.diagram;
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

        // Validate Mermaid syntax before saving
        if (!this.validateMermaidSyntax(updatedContent)) {
          throw new Error('Updated diagram does not contain valid Mermaid syntax');
        }
      }

      // Save updated diagram as new version with parent relationship
      await saveDocument({
        id: documentId,
        title: currentDocument.title || 'Untitled Diagram',
        kind: 'code',
        content: updatedContent,
        userId: user.id,
        chatId,
        parentVersionId: currentDocument.id,
        metadata: {
          agent: 'GoogleMermaidAgent',
          method: 'updateDiagram',
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
        errorText: `Failed to update Mermaid diagram: ${errorMessage}`,
      });

      throw new Error(`GoogleMermaidAgent.updateDiagram failed: ${errorMessage}`);
    }
  }

  /**
   * Apply line-range update to existing diagram content
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