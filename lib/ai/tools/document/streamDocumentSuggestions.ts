import "server-only";

import { streamObject } from "ai";
import type { UIMessageStreamWriter } from "ai";
import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import type { User } from "@supabase/supabase-js";
import { getDocumentById } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";
import { z } from "zod";

/**
 * Generate suggestions for a document using AI SDK's streamObject
 * Suggestions are streamed in real-time as they are generated
 */
export async function streamDocumentSuggestions(params: {
  documentId: string;
  instruction: string;
  systemPrompt: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  user?: User | null;
  chatId?: string;
  modelId: string;
  apiKey?: string;
}): Promise<{ documentId: string; suggestionCount: number }> {
  const { documentId, instruction, systemPrompt, dataStream, user, chatId, modelId, apiKey } = params;

  console.log('💡 [SUGGESTIONS] Starting suggestion generation');
  console.log('💡 [SUGGESTIONS] Document ID:', documentId);
  console.log('💡 [SUGGESTIONS] Model:', modelId);

  // Fetch the existing document from database
  const document = await getDocumentById({ id: documentId });

  if (!document) {
    throw new Error(`Document with ID ${documentId} not found`);
  }

  if (document.kind !== 'text') {
    throw new Error(`Document ${documentId} is not a text document (kind: ${document.kind})`);
  }

  console.log('💡 [SUGGESTIONS] Document found:', document.title);
  console.log('💡 [SUGGESTIONS] Content length:', document.content?.length || 0);

  // Get the Google model instance with proper API key handling
  let model;
  if (apiKey) {
    const googleProvider = createGoogleGenerativeAI({ apiKey });
    model = googleProvider(modelId);
  } else {
    model = google(modelId);
  }

  // Define the suggestion schema
  const suggestionSchema = z.object({
    suggestions: z.array(
      z.object({
        originalText: z.string().describe('The exact text from the document that needs improvement'),
        suggestedText: z.string().describe('The improved replacement text'),
        description: z.string().describe('Brief explanation of why this suggestion improves the text')
      })
    )
  });

  // Build the prompt for suggestion generation
  const userPrompt = `Analyze the following document and provide specific, actionable suggestions for improvement.

DOCUMENT CONTENT:
"""
${document.content || ''}
"""

USER REQUEST:
${instruction}

IMPORTANT INSTRUCTIONS:
1. Identify 3-7 specific areas that could be improved (grammar, clarity, style, structure, word choice)
2. For each suggestion, provide:
   - originalText: The exact text snippet from the document (5-15 words for context)
   - suggestedText: Your improved version of that text
   - description: A brief explanation of why your suggestion is better
3. Focus on meaningful improvements, not trivial changes
4. Ensure originalText matches exactly as it appears in the document
5. Keep suggestions concise and actionable

Generate suggestions as a JSON array following the specified schema.`;

  try {
    // Use streamObject to get structured suggestions
    const { partialObjectStream } = streamObject({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      schema: suggestionSchema,
      temperature: 0.7,
    });

    console.log('💡 [SUGGESTIONS] Starting to stream suggestions');

    let suggestionCount = 0;

    // Stream suggestions as they are generated
    for await (const partialObject of partialObjectStream) {
      if (partialObject.suggestions && Array.isArray(partialObject.suggestions)) {
        // Check if we have new suggestions to stream
        const currentSuggestionCount = partialObject.suggestions.length;

        if (currentSuggestionCount > suggestionCount) {
          // Stream only the new suggestions
          for (let i = suggestionCount; i < currentSuggestionCount; i++) {
            const suggestion = partialObject.suggestions[i];

            // Only stream if the suggestion is complete
            if (suggestion.originalText && suggestion.suggestedText && suggestion.description) {
              console.log(`💡 [SUGGESTIONS] Streaming suggestion ${i + 1}:`, {
                original: suggestion.originalText.substring(0, 50),
                suggested: suggestion.suggestedText.substring(0, 50),
              });

              // Write suggestion to stream
              dataStream.write({
                type: "data-suggestion",
                data: {
                  id: `${documentId}-suggestion-${Date.now()}-${i}`,
                  documentId,
                  originalText: suggestion.originalText,
                  suggestedText: suggestion.suggestedText,
                  description: suggestion.description,
                  createdAt: new Date(),
                  user_id: user?.id || null,
                  chat_id: chatId || null,
                },
                transient: true,
              });

              suggestionCount++;
            }
          }
        }
      }
    }

    console.log('💡 [SUGGESTIONS] Suggestion generation complete');
    console.log('💡 [SUGGESTIONS] Total suggestions generated:', suggestionCount);

    // Signal completion
    dataStream.write({
      type: "data-finish",
      data: null,
      transient: true,
    });

    return {
      documentId,
      suggestionCount,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ [SUGGESTIONS] Generation failed:', errorMessage);

    // Write error to stream
    dataStream.write({
      type: "data-finish",
      data: null,
      transient: true,
    });

    throw new Error(`Failed to generate suggestions: ${errorMessage}`);
  }
}
