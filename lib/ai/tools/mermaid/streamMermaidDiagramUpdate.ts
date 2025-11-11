import "server-only";

import { streamObject } from "ai";
import type { UIMessageStreamWriter } from "ai";
import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import type { User } from "@supabase/supabase-js";
import { saveDocument, getDocumentById } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";
import { z } from "zod";

/**
 * Validate Mermaid syntax (basic validation)
 */
function validateMermaidSyntax(diagram: string): boolean {
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
 * Stream Mermaid diagram update in real-time using AI SDK's streamObject
 * Updates existing diagram based on user instructions
 */
export async function streamMermaidDiagramUpdate(params: {
  diagramId: string;
  updateInstruction: string; // The user's update request
  systemPrompt: string; // System prompt from database config
  dataStream: UIMessageStreamWriter<ChatMessage>;
  user?: User | null;
  chatId?: string;
  modelId: string;
  apiKey?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const { diagramId, updateInstruction, systemPrompt, dataStream, user, chatId, modelId, apiKey, metadata = {} } = params;

  console.log('🎨 [STREAM-UPDATE] Starting real-time diagram update');
  console.log('🎨 [STREAM-UPDATE] Diagram ID:', diagramId);
  console.log('🎨 [STREAM-UPDATE] Model:', modelId);

  // Get the current diagram document
  const currentDocument = await getDocumentById({ id: diagramId });
  if (!currentDocument) {
    throw new Error(`Diagram with id ${diagramId} not found`);
  }

  console.log('🎨 [STREAM-UPDATE] Current version:', currentDocument.version_number);
  console.log('🎨 [STREAM-UPDATE] Current content length:', currentDocument.content?.length || 0);

  // Write artifact metadata to inform UI
  dataStream.write({
    type: "data-kind",
    data: "mermaid code",
    transient: true,
  });

  dataStream.write({
    type: "data-id",
    data: diagramId,
    transient: true,
  });

  dataStream.write({
    type: "data-title",
    data: currentDocument.title || "Untitled Diagram",
    transient: true,
  });

  dataStream.write({
    type: "data-clear",
    data: null,
    transient: true,
  });

  console.log('🎨 [STREAM-UPDATE] Metadata written, starting LLM generation');

  // Get the Google model instance with proper API key handling
  let model;
  if (apiKey) {
    const googleProvider = createGoogleGenerativeAI({ apiKey });
    model = googleProvider(modelId);
  } else {
    model = google(modelId); // Fallback to environment variable
  }

  // Build the prompt for diagram update
  const prompt = `Current Mermaid diagram:\n\`\`\`mermaid\n${currentDocument.content || ''}\n\`\`\`\n\nUpdate instructions: ${updateInstruction}\n\nProvide the COMPLETE updated diagram.`;

  try {
    // Use streamObject for structured diagram updates
    const { partialObjectStream } = streamObject({
      model,
      system: systemPrompt,
      prompt: prompt,
      schema: z.object({
        diagram: z.string().describe('Updated Mermaid diagram with valid syntax and proper formatting'),
      }),
    });

    console.log('🎨 [STREAM-UPDATE] LLM streaming started');

    // Accumulate content as it streams
    let updatedContent = "";
    let chunkCount = 0;

    // Stream content in real-time as LLM generates it
    for await (const partialObject of partialObjectStream) {
      if (partialObject.diagram) {
        updatedContent = partialObject.diagram;
        chunkCount++;

        // Write each delta immediately to the client
        dataStream.write({
          type: "data-codeDelta",
          data: updatedContent, // Replace entire content
          transient: true,
        });
      }
    }

    console.log('🎨 [STREAM-UPDATE] LLM generation complete');
    console.log('🎨 [STREAM-UPDATE] Updated content length:', updatedContent.length);
    console.log('🎨 [STREAM-UPDATE] Total chunks streamed:', chunkCount);

    // Validate Mermaid syntax before saving
    if (!validateMermaidSyntax(updatedContent)) {
      throw new Error('Updated diagram does not contain valid Mermaid syntax');
    }

    // Save updated diagram as new version
    if (user?.id) {
      console.log('🎨 [STREAM-UPDATE] Saving to database as new version');
      await saveDocument({
        id: diagramId,
        title: currentDocument.title || "Untitled Diagram",
        content: updatedContent,
        kind: "mermaid code",
        userId: user.id,
        chatId,
        parentVersionId: currentDocument.id,
        metadata: {
          ...metadata,
          updateType: 'update',
          agent: 'GoogleMermaidAgentStreaming',
          updatedAt: new Date().toISOString(),
          modelUsed: modelId,
          previousVersion: currentDocument.version_number,
        },
      });
      console.log('✅ [STREAM-UPDATE] Saved to database');
    } else {
      console.log('⚠️ [STREAM-UPDATE] No user provided, skipping database save');
    }

    // Signal streaming complete
    dataStream.write({
      type: "data-finish",
      data: null,
      transient: true,
    });

    console.log('✅ [STREAM-UPDATE] Diagram update completed successfully');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ [STREAM-UPDATE] Update failed:', errorMessage);

    // Write error to stream
    dataStream.write({
      type: "data-finish",
      data: null,
      transient: true,
    });

    throw new Error(`Failed to update diagram: ${errorMessage}`);
  }
}
