// @ts-nocheck - DISABLED FOR MVP
/** import "server-only";

import { google } from '@ai-sdk/google';
import { streamText, generateText, tool, type LanguageModel, type Tool } from 'ai';
import { z } from 'zod';
import type { AgentConfig } from '../../config-loader';
import type {
  ChatParams,
  StreamingResponse
} from '../../core/types';
import {
  ProviderError,
  AgentError,
  StreamingError,
  ErrorCodes
} from '../../core/errors';


 * Google Git MCP Agent implementation
 * Handles Git and GitHub operations through MCP (Model Context Protocol)
 * NOTE: This agent is not currently integrated in the chat route
export class GoogleGitMcpAgent {
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Generate streaming response with Git/GitHub capabilities
  async *chat(params: ChatParams): AsyncGenerator<StreamingResponse, void, unknown> {
    try {
      const model = this.getModel(params.modelId);
      const systemPrompt = params.systemPrompt || this.config.systemPrompt;

      // Convert messages to AI SDK format
      const messages = params.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));

      // Configure available tools
      const tools = this.getAvailableTools();

      const result = streamText({
        model,
        system: systemPrompt,
        messages,
        tools,

        temperature: 0.7
      });

      // Stream the response
      let hasStarted = false;
      for await (const chunk of result.textStream) {
        if (!hasStarted) {
          hasStarted = true;
        }

        yield {
          content: chunk,
          finished: false
        };
      }

      // Get final result
      const finalResult = await result;
      
      yield {
        content: '',
        finished: true
      };

    } catch (error) {
      console.error('Google Git MCP Agent error:', error);
      
      throw new StreamingError(
        `Failed to generate Git MCP response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get available tools based on configuration
  private getAvailableTools(): Record<string, Tool> {
    const tools: Record<string, Tool> = {};

    // Dynamically create tools based on configuration
    if (this.config.tools) {
      Object.entries(this.config.tools).forEach(([toolName, toolConfig]) => {
        if (toolConfig.enabled) {
          const gitTool = this.createGitTool(toolName, toolConfig);
          if (gitTool) {
            tools[toolName] = gitTool;
          }
        }
      });
    }

    return tools;
  }

  /**
   * Create a Git tool based on the tool name and configuration
  private createGitTool(toolName: string, toolConfig: any): Tool | undefined {
    switch (toolName) {
      case 'gitStatus':
        return tool({
          description: 'Get the current Git status of the repository',
          parameters: z.object({
            path: z.string().optional().describe('Repository path (defaults to current directory)')
          }),
          execute: async ({ path }: { path?: string }) => {
            try {
              // Placeholder implementation - would integrate with actual Git commands
              return {
                status: 'clean',
                branch: 'main',
                ahead: 0,
                behind: 0,
                staged: [],
                unstaged: [],
                untracked: [],
                path: path || '.'
              };
            } catch (error) {
              throw new Error(`Git status failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        });

      case 'gitCommit':
        return tool({
          description: 'Create a Git commit with the specified message',
          parameters: z.object({
            message: z.string().describe('Commit message'),
            files: z.array(z.string()).optional().describe('Specific files to commit (defaults to all staged files)'),
            addAll: z.boolean().optional().default(false).describe('Add all changes before committing')
          }),
          execute: async ({ message, files, addAll }: { message: string; files?: string[]; addAll?: boolean }) => {
            try {
              // Placeholder implementation - would integrate with actual Git commands
              return {
                commitHash: 'abc123def456',
                message,
                files: files || ['all staged files'],
                addAll,
                timestamp: new Date().toISOString()
              };
            } catch (error) {
              throw new Error(`Git commit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        });

      case 'gitBranch':
        return tool({
          description: 'Manage Git branches (list, create, switch, delete)',
          parameters: z.object({
            operation: z.enum(['list', 'create', 'switch', 'delete']).describe('Branch operation to perform'),
            branchName: z.string().optional().describe('Branch name (required for create, switch, delete)'),
            fromBranch: z.string().optional().describe('Source branch for create operation')
          }),
          execute: async ({ operation, branchName, fromBranch }: { operation: string; branchName?: string; fromBranch?: string }) => {
            try {
              // Placeholder implementation - would integrate with actual Git commands
              switch (operation) {
                case 'list':
                  return {
                    operation,
                    branches: ['main', 'develop', 'feature/new-feature'],
                    currentBranch: 'main'
                  };
                case 'create':
                  return {
                    operation,
                    branchName,
                    fromBranch: fromBranch || 'main',
                    created: true
                  };
                case 'switch':
                  return {
                    operation,
                    branchName,
                    switched: true,
                    previousBranch: 'main'
                  };
                case 'delete':
                  return {
                    operation,
                    branchName,
                    deleted: true
                  };
                default:
                  throw new Error(`Unknown branch operation: ${operation}`);
              }
            } catch (error) {
              throw new Error(`Git branch operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        });

      case 'githubPR':
        return tool({
          description: 'Create or manage GitHub pull requests',
          parameters: z.object({
            operation: z.enum(['create', 'list', 'merge', 'close']).describe('PR operation to perform'),
            title: z.string().optional().describe('PR title (required for create)'),
            body: z.string().optional().describe('PR description'),
            baseBranch: z.string().optional().default('main').describe('Base branch for the PR'),
            headBranch: z.string().optional().describe('Head branch for the PR'),
            prNumber: z.number().optional().describe('PR number (required for merge, close)')
          }),
          execute: async ({ operation, title, body, baseBranch, headBranch, prNumber }: { operation: string; title?: string; body?: string; baseBranch?: string; headBranch?: string; prNumber?: number }) => {
            try {
              // Placeholder implementation - would integrate with GitHub API
              switch (operation) {
                case 'create':
                  return {
                    operation,
                    prNumber: 123,
                    title,
                    body,
                    baseBranch,
                    headBranch,
                    url: 'https://github.com/owner/repo/pull/123',
                    created: true
                  };
                case 'list':
                  return {
                    operation,
                    pullRequests: [
                      { number: 123, title: 'Feature: Add new functionality', state: 'open' },
                      { number: 122, title: 'Fix: Bug in authentication', state: 'closed' }
                    ]
                  };
                case 'merge':
                  return {
                    operation,
                    prNumber,
                    merged: true,
                    mergeCommit: 'abc123def456'
                  };
                case 'close':
                  return {
                    operation,
                    prNumber,
                    closed: true
                  };
                default:
                  throw new Error(`Unknown PR operation: ${operation}`);
              }
            } catch (error) {
              throw new Error(`GitHub PR operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        });

      default:
        // Generic tool for other Git operations
        return tool({
          description: `Execute ${toolName} Git operation`,
          parameters: z.object({
            args: z.array(z.string()).optional().describe('Arguments for the Git command'),
            options: z.record(z.string()).optional().describe('Additional options')
          }),
          execute: async ({ args, options }: { args?: string[]; options?: Record<string, string> }) => {
            try {
              // Placeholder implementation - would integrate with actual Git commands
              return {
                tool: toolName,
                args: args || [],
                options: options || {},
                result: `Executed ${toolName} successfully`,
                timestamp: new Date().toISOString()
              };
            } catch (error) {
              throw new Error(`${toolName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        });
    }
  }

  /**
   * Get the appropriate Google model instance
  private getModel(modelId: string): LanguageModel {
    // Git MCP agent doesn't have availableModels in its config
    // Use a default model or get from a different source
    return google(modelId);
  }

  /**
   * Validate the agent configuration
  private validateConfig(): void {
    if (!this.config) {
      throw new AgentError(
        'google-git-mcp',
        ErrorCodes.INVALID_CONFIGURATION,
        'Git MCP agent configuration is required'
      );
    }

    if (!this.config.enabled) {
      throw new AgentError(
        'google-git-mcp',
        ErrorCodes.AGENT_DISABLED,
        'Google Git MCP agent is disabled'
      );
    }

    if (!this.config.tools || Object.keys(this.config.tools).length === 0) {
      throw new AgentError(
        'google-git-mcp',
        ErrorCodes.INVALID_CONFIGURATION,
        'No tools configured for Google Git MCP agent'
      );
    }
  }

  /**
   * Get enabled tools
   
  getEnabledTools(): string[] {
    return Object.entries(this.config.tools)
      .filter(([, toolConfig]) => toolConfig.enabled)
      .map(([toolName]) => toolName);
  }
}

*/