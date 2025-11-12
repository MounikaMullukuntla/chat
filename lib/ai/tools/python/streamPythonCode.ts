import "server-only";

import { streamObject } from "ai";
import type { UIMessageStreamWriter } from "ai";
import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import type { User } from "@supabase/supabase-js";
import { saveDocument } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import { z } from "zod";

/**
 * Validate Python code (basic validation)
 */
function validatePythonCode(code: string): boolean {
  const trimmed = code.trim();

  // Basic checks
  const hasContent = trimmed.length > 0;
  const notEmpty = trimmed !== '';

  // Check for common Python patterns (imports, functions, classes, or basic code)
  const hasPythonPatterns =
    /import\s+\w+/.test(trimmed) ||
    /from\s+\w+/.test(trimmed) ||
    /def\s+\w+/.test(trimmed) ||
    /class\s+\w+/.test(trimmed) ||
    /print\s*\(/.test(trimmed) ||
    /if\s+__name__\s*==/.test(trimmed) ||
    trimmed.includes('=') ||
    trimmed.includes('#');

  return hasContent && notEmpty && hasPythonPatterns;
}

/**
 * Stream Python code creation in real-time using AI SDK's streamObject
 * Content is generated and streamed to the client as the LLM produces it
 */
export async function streamPythonCode(params: {
  title: string;
  instruction: string; // The user's request/instruction for code creation
  systemPrompt: string; // System prompt from database config
  dataStream: UIMessageStreamWriter<ChatMessage>;
  user?: User | null;
  chatId?: string;
  modelId: string;
  apiKey?: string;
  metadata?: Record<string, any>;
  streamToUI?: boolean; // If false, accumulate without streaming (for generate mode)
}): Promise<{ documentId: string; content: string }> {
  const { title, instruction, systemPrompt, dataStream, user, chatId, modelId, apiKey, metadata = {}, streamToUI = true } = params;
  const documentId = generateUUID();

  console.log('🐍 [STREAM-CREATE] Starting real-time code creation');
  console.log('🐍 [STREAM-CREATE] Document ID:', documentId);
  console.log('🐍 [STREAM-CREATE] Title:', title);
  console.log('🐍 [STREAM-CREATE] Model:', modelId);
  console.log('🐍 [STREAM-CREATE] Stream to UI:', streamToUI);

  // Write artifact metadata only if streaming to UI
  if (streamToUI) {
    dataStream.write({
      type: "data-kind",
      data: "python code",
      transient: true,
    });

    dataStream.write({
      type: "data-id",
      data: documentId,
      transient: true,
    });

    dataStream.write({
      type: "data-title",
      data: title,
      transient: true,
    });

    dataStream.write({
      type: "data-clear",
      data: null,
      transient: true,
    });

    console.log('🐍 [STREAM-CREATE] Metadata written, starting LLM generation');
  }

  // Get the Google model instance with proper API key handling
  let model;
  if (apiKey) {
    const googleProvider = createGoogleGenerativeAI({ apiKey });
    model = googleProvider(modelId);
  } else {
    model = google(modelId); // Fallback to environment variable
  }

  try {
    // Use streamObject for structured Python code generation
    const { partialObjectStream } = streamObject({
      model,
      system: systemPrompt,
      prompt: instruction,
      schema: z.object({
        code: z.string().describe('Complete Python code with proper syntax, error handling, and documentation'),
      }),
    });

    console.log('🐍 [STREAM-CREATE] LLM streaming started');

    // Accumulate content as it streams
    let generatedCode = "";
    let chunkCount = 0;

    // Stream content in real-time as LLM generates it
    for await (const partialObject of partialObjectStream) {
      if (partialObject.code) {
        generatedCode = partialObject.code;
        chunkCount++;

        // Write each delta immediately to the client (only if streaming to UI)
        if (streamToUI) {
          dataStream.write({
            type: "data-codeDelta",
            data: generatedCode, // Replace entire content
            transient: true,
          });
        }
      }
    }

    console.log('🐍 [STREAM-CREATE] LLM generation complete');
    console.log('🐍 [STREAM-CREATE] Total content length:', generatedCode.length);
    console.log('🐍 [STREAM-CREATE] Total chunks streamed:', chunkCount);

    // Validate Python code before saving
    if (!validatePythonCode(generatedCode)) {
      console.warn('⚠️ [STREAM-CREATE] Generated code may not be valid Python, but continuing anyway');
    }

    // Save document to database if user is provided and streaming to UI
    if (user?.id && streamToUI) {
      console.log('🐍 [STREAM-CREATE] Saving to database for user:', user.id);
      await saveDocument({
        id: documentId,
        title,
        content: generatedCode,
        kind: "python code",
        userId: user.id,
        chatId,
        metadata: {
          ...metadata,
          updateType: 'create',
          agent: 'GooglePythonAgentStreaming',
          createdAt: new Date().toISOString(),
          modelUsed: modelId,
        },
      });
      console.log('✅ [STREAM-CREATE] Saved to database');
    } else if (!streamToUI) {
      console.log('ℹ️ [STREAM-CREATE] Generate mode - skipping database save');
    } else {
      console.log('⚠️ [STREAM-CREATE] No user provided, skipping database save');
    }

    // Signal streaming complete (only if streaming to UI)
    if (streamToUI) {
      dataStream.write({
        type: "data-finish",
        data: null,
        transient: true,
      });
    }

    console.log('✅ [STREAM-CREATE] Code creation completed successfully');
    return { documentId, content: generatedCode };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ [STREAM-CREATE] Generation failed:', errorMessage);

    // Write error to stream
    if (streamToUI) {
      dataStream.write({
        type: "data-finish",
        data: null,
        transient: true,
      });
    }

    throw new Error(`Failed to create Python code: ${errorMessage}`);
  }
}
