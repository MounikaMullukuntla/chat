import "server-only";

/**
 * Anthropic Provider - TEMPORARILY DISABLED
 * 
 * This provider is commented out for the MVP phase.
 * We're focusing on Google agents first.
 * Will be re-enabled after Google agent system is approved.


// All Anthropic agents are disabled for MVP
// Uncomment when ready to implement Anthropic support

/*
export { AnthropicChatAgent } from './chat-agent';
export { AnthropicProviderToolsAgent } from './provider-tools-agent';
export { AnthropicDocumentAgent } from './document-agent';
export { AnthropicPythonAgent } from './python-agent';
export { AnthropicMermaidAgent } from './mermaid-agent';
export { AnthropicGitMcpAgent } from './git-mcp-agent';


// Placeholder exports to prevent import errors
export class AnthropicProviderFactory {
  static createAgent(): never {
    throw new Error('Anthropic provider is disabled in MVP. Use Google provider instead.');
  }
} */
