/**
 * Main entry point for the AI chat agent system
 */

// Core types and errors
export * from './core/types';
export * from './core/errors';

// Simple chat agent resolver
export { ChatAgentResolver } from './chat-agent-resolver';

// Google agents (for direct usage if needed)
export { GoogleChatAgent } from './providers/google/chat-agent';

// Default model constant
export const DEFAULT_CHAT_MODEL = "gemini-2.0-flash";