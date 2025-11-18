/**
 * Mock AI provider responses for testing
 */

import { vi } from 'vitest';

export const mockGoogleAIResponse = {
  text: 'This is a mock response from Google AI',
  finishReason: 'stop',
  usage: {
    promptTokens: 10,
    completionTokens: 20,
    totalTokens: 30,
  },
};

export const mockStreamingResponse = {
  textStream: (async function* () {
    yield 'Hello ';
    yield 'from ';
    yield 'streaming ';
    yield 'response';
  })(),
};

export const mockGoogleAI = {
  generateText: vi.fn().mockResolvedValue(mockGoogleAIResponse),
  streamText: vi.fn().mockResolvedValue(mockStreamingResponse),
};

export const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'This is a mock response from OpenAI',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      }),
    },
  },
};

export const mockAnthropic = {
  messages: {
    create: vi.fn().mockResolvedValue({
      content: [
        {
          type: 'text',
          text: 'This is a mock response from Anthropic',
        },
      ],
      stop_reason: 'end_turn',
      usage: {
        input_tokens: 10,
        output_tokens: 20,
      },
    }),
  },
};
