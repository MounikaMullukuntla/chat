import "server-only";

import { streamText } from "ai";
import type { UIMessageStreamWriter } from "ai";
import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import type { User } from "@supabase/supabase-js";
import { getDocumentById, saveDocument } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";

/**
 * Stream document update in real-time using AI SDK's streamText
 * Content is generated and streamed to the client as the LLM produces it
 */
export async function streamTextDocumentUpdate(params: {
  documentId: string;
  updateInstruction: string;
  systemPrompt: string; // System prompt from database config
  dataStream: UIMessageStreamWriter<ChatMessage>;
  user?: User | null;
  chatId?: string;
  modelId: string;
  apiKey?: string;
  metadata?: Record<string, any>;
}): Promise<string> {
  const { documentId, updateInstruction, systemPrompt, dataStream, user, chatId, modelId, apiKey, metadata = {} } = params;

  console.log('📝 [STREAM-UPDATE] Starting real-time document update');
  console.log('📝 [STREAM-UPDATE] Document ID:', documentId);
  console.log('📝 [STREAM-UPDATE] Model:', modelId);
  console.log('📝 [STREAM-UPDATE] Instruction:', updateInstruction.substring(0, 100));

  // Fetch the existing document from database
  const document = await getDocumentById({ id: documentId });

  if (!document) {
    throw new Error(`Document with ID ${documentId} not found`);
  }

  if (document.kind !== 'text') {
    throw new Error(`Document ${documentId} is not a text document (kind: ${document.kind})`);
  }

  console.log('📝 [STREAM-UPDATE] Existing document found:', document.title);
  console.log('📝 [STREAM-UPDATE] Current content length:', document.content?.length || 0);

  // Clear the artifact panel for update
  dataStream.write({
    type: "data-clear",
    data: null,
    transient: true,
  });

  console.log('📝 [STREAM-UPDATE] Cleared artifact panel, starting LLM generation');

  // Get the Google model instance with proper API key handling
  let model;
  if (apiKey) {
    const googleProvider = createGoogleGenerativeAI({ apiKey });
    model = googleProvider(modelId);
  } else {
    model = google(modelId); // Fallback to environment variable
  }

  // Build the prompt for document update
  const userPrompt = `Update the following document based on the user's instruction.

CURRENT DOCUMENT:
"""
${document.content || ''}
"""

USER INSTRUCTION:
${updateInstruction}

Please provide the COMPLETE updated document (not just the changes).`;

  try {
    // Use streamText to get real-time generation
    const { fullStream } = streamText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
    });

    console.log('📝 [STREAM-UPDATE] LLM streaming started');

    // Accumulate content as it streams
    let draftContent = "";
    let chunkCount = 0;

    // Stream content in real-time as LLM generates it
    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "text-delta") {
        // In AI SDK v5, text-delta events have a 'textDelta' property
        const text = (delta as any).textDelta || (delta as any).text || '';
        draftContent += text;
        chunkCount++;

        // Write each delta immediately to the client
        dataStream.write({
          type: "data-textDelta",
          data: text,
          transient: true,
        });
      }
    }

    console.log('📝 [STREAM-UPDATE] LLM generation complete');
    console.log('📝 [STREAM-UPDATE] Updated content length:', draftContent.length);
    console.log('📝 [STREAM-UPDATE] Total chunks streamed:', chunkCount);

    // Save updated document to database if user is provided
    if (user?.id) {
      console.log('📝 [STREAM-UPDATE] Saving to database for user:', user.id);
      await saveDocument({
        id: documentId,
        title: document.title,
        content: draftContent,
        kind: "text",
        userId: user.id,
        chatId: chatId || document.chat_id || undefined,
        parentVersionId: `${document.id}`, // Link to previous version
        metadata: {
          ...metadata,
          updateType: 'update',
          agentInfo: 'document-agent-streaming',
          previousVersion: document.version_number,
          updatedAt: new Date().toISOString(),
          modelUsed: modelId,
          updateInstruction,
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

    console.log('✅ [STREAM-UPDATE] Document update completed successfully');
    return documentId;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ [STREAM-UPDATE] Update failed:', errorMessage);

    // Write error to stream
    dataStream.write({
      type: "data-finish",
      data: null,
      transient: true,
    });

    throw new Error(`Failed to update document: ${errorMessage}`);
  }
}
