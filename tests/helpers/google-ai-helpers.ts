/**
 * Google AI testing helpers for real API calls
 */

import { google } from "@ai-sdk/google";
import { generateText, streamText } from "ai";

/**
 * Check if Google AI API key is available for testing
 */
export function hasGoogleApiKey(): boolean {
  return !!process.env.GOOGLE_AI_API_KEY;
}

/**
 * Skip test if Google API key is not available
 */
export function skipIfNoGoogleApiKey() {
  if (!hasGoogleApiKey()) {
    console.warn("⚠️  Skipping test - GOOGLE_AI_API_KEY not set");
    return true;
  }
  return false;
}

/**
 * Get Google AI model for testing
 */
export function getGoogleModel(modelId: string = "gemini-2.5-flash") {
  if (!hasGoogleApiKey()) {
    throw new Error("GOOGLE_AI_API_KEY is required for real API tests");
  }

  return google(modelId, {
    apiKey: process.env.GOOGLE_AI_API_KEY,
  });
}

/**
 * Test Google AI text generation with real API
 */
export async function testGoogleGenerate(
  prompt: string,
  modelId: string = "gemini-2.5-flash"
) {
  const model = getGoogleModel(modelId);

  const result = await generateText({
    model,
    prompt,
  });

  return result;
}

/**
 * Test Google AI streaming with real API
 */
export async function testGoogleStream(
  prompt: string,
  modelId: string = "gemini-2.5-flash"
) {
  const model = getGoogleModel(modelId);

  const result = await streamText({
    model,
    prompt,
  });

  return result;
}

/**
 * Test helper for checking token usage
 */
export function validateTokenUsage(usage: any) {
  return (
    usage &&
    typeof usage.promptTokens === "number" &&
    typeof usage.completionTokens === "number" &&
    usage.promptTokens > 0 &&
    usage.completionTokens > 0
  );
}

/**
 * Test helper for rate limit testing
 */
export async function testRateLimits(
  modelId: string,
  requestCount: number,
  delayMs: number = 100
) {
  const results: boolean[] = [];

  for (let i = 0; i < requestCount; i++) {
    try {
      await testGoogleGenerate(`Test request ${i + 1}`, modelId);
      results.push(true);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } catch (error) {
      results.push(false);
      if (error instanceof Error && error.message.includes("rate limit")) {
        // Expected behavior - rate limit hit
        break;
      }
      throw error;
    }
  }

  return {
    successCount: results.filter((r) => r).length,
    totalAttempts: results.length,
    rateLimitHit: results.length < requestCount,
  };
}

/**
 * Test helper for thinking mode
 */
export async function testThinkingMode(
  prompt: string,
  modelId: string = "gemini-2.5-flash"
) {
  const model = getGoogleModel(modelId);

  const result = await generateText({
    model,
    prompt,
    experimental_telemetry: {
      isEnabled: true,
    },
  });

  return {
    hasThinkingTokens: result.usage.promptTokens > prompt.length / 4,
    result,
  };
}
