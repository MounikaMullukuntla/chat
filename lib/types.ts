import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/artifact";
import type { createDocument } from "./ai/tools/create-document";
import type { getWeather } from "./ai/tools/get-weather";
import type { requestSuggestions } from "./ai/tools/request-suggestions";
import type { updateDocument } from "./ai/tools/update-document";
import type { Suggestion } from "./db/schema";
import type { AppUsage } from "./usage";

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  usage: AppUsage;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};

// Enhanced admin configuration interfaces for chat input enhancements
export interface ModelCapabilities {
  supportsThinkingMode: boolean;
  fileInputEnabled: boolean;
  allowedFileTypes: string[];
}

export interface EnhancedModelConfig {
  id: string;
  name: string;
  description: string;
  pricingPerMillionTokens: {
    input: number;
    output: number;
  };
  enabled: boolean;
  isDefault: boolean;
  thinkingEnabled?: boolean;
  // New capabilities
  supportsThinkingMode: boolean;
  fileInputEnabled: boolean;
  allowedFileTypes: string[];
}

export interface ProviderCapabilities {
  enabled: boolean;
  models: Record<string, EnhancedModelConfig>;
  // Provider-level file input settings
  fileInputEnabled: boolean;
  allowedFileTypes: string[];
}

export interface AdminConfigSummary {
  providers: Record<string, ProviderCapabilities>;
}

// GitHub integration types
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  private: boolean;
  description: string;
  stargazers_count?: number;
  forks_count?: number;
  language?: string;
}

export interface GitHubSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepo[];
}

export interface GitHubContextState {
  searchQuery: string;
  searchResults: GitHubRepo[];
  selectedRepos: GitHubRepo[];
  isLoading: boolean;
  error: string | null;
}

// GitHub MCP Agent Types
export interface RateLimit {
  perMinute: number;
  perHour: number;
  perDay: number;
}

export interface GitMcpAgentConfig {
  enabled: boolean;
  systemPrompt: string;
  rateLimit: RateLimit;
  tools: Record<string, {
    description: string;
    enabled: boolean;
  }>;
}

export interface AgentResult {
  output: string;
  success: boolean;
  toolCalls?: Array<{
    toolName: string;
    args: Record<string, any>;
    result: any;
  }>;
  reasoning?: string;
  error?: string;
}

export interface GitHubFile {
  path: string;
  name: string;
  type: 'file';
  size?: number;
  sha?: string;
  content?: string;
  url?: string;
}

export interface GitHubFolder {
  path: string;
  name: string;
  type: 'dir';
  contents?: Array<GitHubFile | GitHubFolder>;
  url?: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  author?: {
    login: string;
    avatar_url: string;
  };
  url: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  labels: Array<{
    name: string;
    color: string;
  }>;
  body?: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: 'open' | 'closed';
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  draft: boolean;
  merged: boolean;
}

export interface GitHubContext {
  repos: GitHubRepo[];
  files: GitHubFile[];
  folders: GitHubFolder[];
  branches?: GitHubBranch[];
}
