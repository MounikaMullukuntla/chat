/**import "server-only";


 * OpenAI Provider - TEMPORARILY DISABLED
 * 
 * This provider is commented out for the MVP phase.
 * We're focusing on Google agents first.
 * Will be re-enabled after Google agent system is approved.
 */

// All OpenAI agents are disabled for MVP
// Uncomment when ready to implement OpenAI support

/*
export { OpenAIChatAgent } from './chat-agent';
export { OpenAIProviderToolsAgent } from './provider-tools-agent';
export { OpenAIDocumentAgent } from './document-agent';
export { OpenAIPythonAgent } from './python-agent';
export { OpenAIMermaidAgent } from './mermaid-agent';
export { OpenAIGitMcpAgent } from './git-mcp-agent';


// Placeholder exports to prevent import errors
export class OpenAIProviderFactory {
  static createAgent(): never {
    throw new Error('OpenAI provider is disabled in MVP. Use Google provider instead.');
  }
}*/
