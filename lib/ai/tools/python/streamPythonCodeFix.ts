import "server-only";

import { streamObject } from "ai";
import type { UIMessageStreamWriter } from "ai";
import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import type { User } from "@supabase/supabase-js";
import { saveDocument, getDocumentById } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";
import { z } from "zod";

/**
 * Validate Python code (basic validation)
 */
function validatePythonCode(code: string): boolean {
  const trimmed = code.trim();

  // Basic checks
  const hasContent = trimmed.length > 0;
  const notEmpty = trimmed !== '';

  // Check for common Python patterns
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
 * Stream Python code fix in real-time using AI SDK's streamObject
 * Fixes errors in existing code
 */
export async function streamPythonCodeFix(params: {
  codeId: string;
  errorInfo: string; // Error information from execution or syntax checking
  systemPrompt: string; // System prompt from database config
  dataStream: UIMessageStreamWriter<ChatMessage>;
  user?: User | null;
  chatId?: string;
  modelId: string;
  apiKey?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const { codeId, errorInfo, systemPrompt, dataStream, user, chatId, modelId, apiKey, metadata = {} } = params;

  console.log('🐍 [STREAM-FIX] Starting real-time code fix');
  console.log('🐍 [STREAM-FIX] Code ID:', codeId);
  console.log('🐍 [STREAM-FIX] Model:', modelId);

  // Get the current code document
  const currentDocument = await getDocumentById({ id: codeId });
  if (!currentDocument) {
    throw new Error(`Code with id ${codeId} not found`);
  }

  console.log('🐍 [STREAM-FIX] Current version:', currentDocument.version_number);
  console.log('🐍 [STREAM-FIX] Current content length:', currentDocument.content?.length || 0);

  // Write artifact metadata to inform UI
  dataStream.write({
    type: "data-kind",
    data: "python code",
    transient: true,
  });

  dataStream.write({
    type: "data-id",
    data: codeId,
    transient: true,
  });

  dataStream.write({
    type: "data-title",
    data: currentDocument.title || "Untitled Code",
    transient: true,
  });

  dataStream.write({
    type: "data-clear",
    data: null,
    transient: true,
  });

  console.log('🐍 [STREAM-FIX] Metadata written, starting LLM generation');

  // Get the Google model instance with proper API key handling
  let model;
  if (apiKey) {
    const googleProvider = createGoogleGenerativeAI({ apiKey });
    model = googleProvider(modelId);
  } else {
    model = google(modelId); // Fallback to environment variable
  }

  // Build the prompt for code fix
  const prompt = `Python code with errors:\n\`\`\`python\n${currentDocument.content || ''}\n\`\`\`\n\nError information: ${errorInfo}\n\nFix all errors and provide the COMPLETE corrected code.`;

  try {
    // Use streamObject for structured code fixes
    const { partialObjectStream } = streamObject({
      model,
      system: systemPrompt,
      prompt: prompt,
      schema: z.object({
        code: z.string().describe('Fixed Python code with proper syntax, error handling, and documentation'),
      }),
    });

    console.log('🐍 [STREAM-FIX] LLM streaming started');

    // Accumulate content as it streams
    let fixedContent = "";
    let chunkCount = 0;

    // Stream content in real-time as LLM generates it
    for await (const partialObject of partialObjectStream) {
      if (partialObject.code) {
        fixedContent = partialObject.code;
        chunkCount++;

        // Write each delta immediately to the client
        dataStream.write({
          type: "data-codeDelta",
          data: fixedContent, // Replace entire content
          transient: true,
        });
      }
    }

    console.log('🐍 [STREAM-FIX] LLM generation complete');
    console.log('🐍 [STREAM-FIX] Fixed content length:', fixedContent.length);
    console.log('🐍 [STREAM-FIX] Total chunks streamed:', chunkCount);

    // Validate Python code before saving
    if (!validatePythonCode(fixedContent)) {
      console.warn('⚠️ [STREAM-FIX] Fixed code may not be valid Python, but continuing anyway');
    }

    // Save fixed code as new version
    if (user?.id) {
      console.log('🐍 [STREAM-FIX] Saving to database as new version');
      await saveDocument({
        id: codeId,
        title: currentDocument.title || "Untitled Code",
        content: fixedContent,
        kind: "python code",
        userId: user.id,
        chatId,
        parentVersionId: currentDocument.id,
        metadata: {
          ...metadata,
          updateType: 'fix',
          agent: 'GooglePythonAgentStreaming',
          fixedAt: new Date().toISOString(),
          modelUsed: modelId,
          previousVersion: currentDocument.version_number,
          errorFixed: errorInfo,
        },
      });
      console.log('✅ [STREAM-FIX] Saved to database');
    } else {
      console.log('⚠️ [STREAM-FIX] No user provided, skipping database save');
    }

    // Signal streaming complete
    dataStream.write({
      type: "data-finish",
      data: null,
      transient: true,
    });

    console.log('✅ [STREAM-FIX] Code fix completed successfully');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ [STREAM-FIX] Fix failed:', errorMessage);

    // Write error to stream
    dataStream.write({
      type: "data-finish",
      data: null,
      transient: true,
    });

    throw new Error(`Failed to fix Python code: ${errorMessage}`);
  }
}
