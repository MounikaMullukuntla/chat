# Multi-Agent Google Chat Model Implementation Plan - FINAL

## Executive Summary

This document outlines the **finalized** comprehensive plan for implementing a multi-agent architecture for the Google chat model system with artifact support. All design decisions have been confirmed based on user requirements.

---

## Confirmed Design Decisions

### ✅ Decision Summary

1. **Schema Enhancement**: ✅ **Implement version control from beginning** with enhanced Document table
2. **Mermaid Artifact Type**: ✅ **Create new `kind: 'mermaid code'`**
3. **Line-Range Updates**: ✅ **Chat model decides + support targeted line-range updates**
4. **Code Execution Logic**: ✅ **"calculate/what is/run" → Provider Tools | "write code/create script" → Python Agent**
5. **Git MCP Agent**: ✅ **Keep config, skip implementation for now**
6. **Thinking Mode**: ✅ **User-toggleable via UI**
7. **Image Output**: ✅ **Only matplotlib via Pyodide (no native Gemini image generation)**
8. **Error Handling**: ✅ **No retry logic - user retries manually if error occurs**
9. **Sheet Artifact**: ✅ **Document Agent handles sheets**
10. **Multi-Modal Files**: ✅ **Chat agent processes files, passes content to specialized agents**

---

## Updated Database Schema

### Strategy: Direct Migration File Updates + DB Reset

**No new migration file needed.** We will:
1. Update existing migration files (`0001_tables.sql`, `0003_indexes.sql`)
2. Run `npm run db:reset` to recreate database with new schema
3. Run `npm run db:migrate` to apply all migrations
4. Run `npm run db:verify` to confirm setup

### Changes Overview

**Modified Columns in Document Table**:
- `kind`: Changed from `VARCHAR(10)` to `VARCHAR(20)` with new values: `'text'`, `'python code'`, `'mermaid code'`, `'sheet'`
- **New columns added**:
  - `chat_id UUID` - Links artifact to chat conversation
  - `parent_version_id UUID` - Links to previous version
  - `version_number INTEGER` - Sequential version tracking
  - `metadata JSONB` - Stores update metadata

**New Indexes Added**:
- `idx_document_versions` - For version queries
- `idx_document_chat` - For chat-specific artifacts
- `idx_document_parent` - For version hierarchy
- `idx_document_kind` - For kind-specific queries

---

## Updated Architecture

### High-Level Flow (Finalized)

```
User Input (text + files) → Chat Model Agent
                                    ↓
                        ┌───────────┴───────────┐
                        │  Process Files        │
                        │  Extract Content      │
                        └───────────┬───────────┘
                                    ↓
                        ┌───────────┴───────────┐
                        │  Decision Logic       │
                        │  (via streamObject)   │
                        │  - Direct response?   │
                        │  - Delegate to agent? │
                        │  - Generate content?  │
                        └───────────┬───────────┘
                                    ↓
    ┌───────────────────────────────┴───────────────────────────────┐
    │                                                               │
    ▼                                                               ▼
Handle Directly                                    Delegate to Specialized Agent
    ↓                                                               ↓
Stream Response                       ┌─────────────────────────────┴──────────────────────────┐
                                      │                             │                          │
                                      ▼                             ▼                          ▼
                          ┌───────────────────────┐   ┌────────────────────┐   ┌──────────────────────┐
                          │  Document Agent       │   │  Python Agent      │   │  Mermaid Agent       │
                          │  (text, sheet)        │   │  (python code)     │   │  (mermaid code)      │
                          │                       │   │                    │   │                      │
                          │  Can:                 │   │  Can:              │   │  Can:                │
                          │  1. Generate content  │   │  1. Generate code  │   │  1. Generate diagram │
                          │  2. Inject content    │   │  2. Inject code    │   │  2. Inject diagram   │
                          │                       │   │  3. Line-range     │   │  3. Line-range       │
                          │                       │   │     updates        │   │     updates          │
                          └───────────┬───────────┘   └──────────┬─────────┘   └──────────┬───────────┘
                                      │                          │                        │
                                      ▼                          ▼                        ▼
                          Create/Update Artifact     Create/Update Artifact   Create/Update Artifact
                                      │                          │                        │
                                      ▼                          ▼                        ▼
                          Stream to Client           Stream to Client         Stream to Client
                                      │                          │                        │
                                      └──────────────┬───────────┴────────────────────────┘
                                                     │
                                                     ▼
                                          Return to Chat Agent
                                                     ↓
                                          Continue Conversation

                                      ┌──────────────┴──────────────┐
                                      │                             │
                                      ▼                             ▼
                          ┌───────────────────────┐   ┌─────────────────────┐
                          │  Provider Tools Agent │   │  (Future: Git MCP)  │
                          │  (search, execute)    │   │                     │
                          │                       │   │  Not implemented    │
                          │  Returns:             │   │  in Phase 1         │
                          │  - Search results     │   └─────────────────────┘
                          │  - Execution output   │
                          └───────────┬───────────┘
                                      │
                                      ▼
                          Return results to Chat Agent
                                      ↓
                          Chat Agent continues conversation
```

---

## Architecture Clarification

### ✅ All Agents Are Equal - Flat Hierarchy

**IMPORTANT**: The diagram above shows that **all specialized agents are on the same level**. There is NO hierarchy between them.

- **Chat Model Agent** is the ONLY orchestrator
- **Document Agent**, **Python Agent**, **Mermaid Agent**, and **Provider Tools Agent** are ALL direct tools of the Chat Model Agent
- None of the specialized agents call each other
- Each specialized agent is independent and self-contained

### Agent Responsibilities

1. **Chat Model Agent** (`streamObject` in chat route):
   - Receives user input
   - Processes file uploads
   - Decides which tool/agent to use (or respond directly)
   - Invokes exactly ONE specialized agent per tool call
   - Aggregates results and continues conversation

2. **Document Agent** (independent):
   - Creates/updates text documents
   - Creates/updates spreadsheet (CSV) data
   - Can generate content OR inject pre-generated content
   - Returns control to Chat Agent when done

3. **Python Agent** (independent):
   - Creates/updates Python code artifacts
   - Supports line-range updates
   - Can generate code OR inject pre-generated code
   - Returns control to Chat Agent when done

4. **Mermaid Agent** (independent):
   - Creates/updates Mermaid diagrams
   - Supports line-range updates
   - Can generate diagrams OR inject pre-generated diagrams
   - Returns control to Chat Agent when done

5. **Provider Tools Agent** (independent):
   - Executes Google Search
   - Executes code for output only (not artifacts)
   - Returns results to Chat Agent

### Implementation Verification

The chat route implementation (section 1.2) already correctly implements this flat hierarchy:

```typescript
tools: {
  respondDirectly: tool({ ... }),      // Chat handles directly
  documentAgent: tool({ ... }),        // Independent agent - same level
  pythonCodeAgent: tool({ ... }),      // Independent agent - same level
  mermaidCodeAgent: tool({ ... }),     // Independent agent - same level
  providerToolsAgent: tool({ ... }),   // Independent agent - same level
}
```

**Each tool is invoked independently by the Chat Model Agent. No agent calls another agent.**

---

## Implementation Plan - Phase 1: Core Multi-Agent Setup

### 1.1 Update Database Schema

**IMPORTANT**: We will update existing migration files directly since we'll be running `npm run db:reset` after implementation.

#### Step 1.1.1: Update Document Table Schema

**File**: `code-chatbot/lib/db/migrations/0001_tables.sql`

Find the Document table definition (around line 47-56) and replace it with:

```sql
-- Document table - Artifacts (text, code, diagrams, spreadsheets) with version tracking
CREATE TABLE IF NOT EXISTS "Document" (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    title TEXT NOT NULL,
    content TEXT,
    kind VARCHAR(20) CHECK (kind IN ('text', 'python code', 'mermaid code', 'sheet')) NOT NULL DEFAULT 'text',
    user_id UUID NOT NULL,
    chat_id UUID REFERENCES "Chat"(id) ON DELETE CASCADE,
    parent_version_id UUID,
    version_number INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    PRIMARY KEY (id, "createdAt")
);

-- Add comment for documentation
COMMENT ON TABLE "Document" IS 'Stores artifacts (documents, code, diagrams, sheets) with full version history';
COMMENT ON COLUMN "Document".parent_version_id IS 'Links to previous version for tracking changes';
COMMENT ON COLUMN "Document".version_number IS 'Sequential version number starting at 1';
COMMENT ON COLUMN "Document".metadata IS 'JSON metadata: {lineRange: {start, end}, updateType: "full"|"partial"|"injection", agentUsed: "document"|"python"|"mermaid"}';
```

#### Step 1.1.2: Add Document Indexes

**File**: `code-chatbot/lib/db/migrations/0003_indexes.sql`

Add these new indexes after the existing Document indexes (around line 14-16):

```sql
-- Document indexes (existing)
CREATE INDEX IF NOT EXISTS idx_document_user_id ON "Document"(user_id);
CREATE INDEX IF NOT EXISTS idx_document_user ON "Document"(user_id, "createdAt" DESC);

-- NEW: Version control indexes
CREATE INDEX IF NOT EXISTS idx_document_versions ON "Document"(id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_document_chat ON "Document"(chat_id) WHERE chat_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_parent ON "Document"(parent_version_id) WHERE parent_version_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_kind ON "Document"(kind, "createdAt" DESC);
```

#### Step 1.1.3: Update Database Queries

**File**: `code-chatbot/lib/db/queries.ts`

Add/update these functions:

#### Step 1.1.4: Reset and Verify Database

After making all the above changes, run these commands:

```bash
# Reset database (drops and recreates)
npm run db:reset

# Apply all migrations
npm run db:migrate

# Verify setup
npm run db:verify
```

**IMPORTANT**:
- Running `db:reset` will **drop all existing data**
- Make sure to backup any important data before resetting
- The seed data files (`0006_seed_data_*.sql`) will be re-applied automatically

---

### 1.2 Update Database Query Functions

**File**: `code-chatbot/lib/db/queries.ts`

Update/add these functions for version control:

```typescript
export async function saveDocument({
  id,
  title,
  content,
  kind,
  userId,
  chatId,
  parentVersionId,
  metadata,
}: {
  id: string;
  title: string;
  content: string;
  kind: 'text' | 'python code' | 'mermaid code' | 'sheet';
  userId: string;
  chatId?: string;
  parentVersionId?: string;
  metadata?: Record<string, any>;
}) {
  const supabase = await createClient();

  // Get the next version number
  let versionNumber = 1;
  if (parentVersionId) {
    const { data: parentDoc } = await supabase
      .from('Document')
      .select('version_number')
      .eq('id', id)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    if (parentDoc) {
      versionNumber = parentDoc.version_number + 1;
    }
  }

  const { data, error } = await supabase
    .from('Document')
    .insert({
      id,
      title,
      content,
      kind,
      user_id: userId,
      chat_id: chatId,
      parent_version_id: parentVersionId,
      version_number: versionNumber,
      metadata: metadata || {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save document: ${error.message}`);
  }

  return data;
}

export async function getDocumentVersions({ id }: { id: string }) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('Document')
    .select('*')
    .eq('id', id)
    .order('version_number', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch document versions: ${error.message}`);
  }

  return data;
}
```

---

### 1.3 Update Chat Route with streamObject

**File**: `code-chatbot/app/(chat)/api/chat/route.ts`

Complete rewrite to use `streamObject` for Google provider:

```typescript
// At the top of the file
import { google } from '@ai-sdk/google';
import { streamObject, streamText, type UIMessageStreamWriter } from 'ai';

// ... existing imports ...

export async function POST(request: Request) {
  // ... existing validation and auth code ...

  const {
    id,
    message,
    selectedChatModel,
    selectedVisibilityType,
    thinkingEnabled, // NEW: From UI toggle
  }: {
    id: string;
    message: ChatMessage;
    selectedChatModel: ChatModel["id"];
    selectedVisibilityType: VisibilityType;
    thinkingEnabled: boolean; // NEW
  } = requestBody;

  // ... existing auth, rate limiting, chat creation code ...

  // NEW: Extract file contents from attachments
  const fileContexts: string[] = [];
  if (message.attachments && message.attachments.length > 0) {
    for (const attachment of message.attachments) {
      try {
        // Process different file types
        const fileContent = await extractFileContent(attachment);
        fileContexts.push(`File: ${attachment.name}\nContent:\n${fileContent}`);
      } catch (error) {
        console.error(`Failed to process file ${attachment.name}:`, error);
      }
    }
  }

  const fileContext = fileContexts.length > 0
    ? `\n\nAttached files:\n${fileContexts.join('\n\n')}`
    : '';

  // Load agent configurations
  const configs = await loadGoogleAgentConfigs();

  const streamId = generateUUID();
  await createStreamId({ streamId, chatId: id });

  let finalMergedUsage: AppUsage | undefined;

  const stream = createUIMessageStream({
    execute: ({ writer: dataStream }) => {
      // NEW: Use streamObject for Google chat agent
      const result = streamObject({
        model: google(selectedChatModel), // User-selected model
        system: configs.chatAgent.systemPrompt,
        messages: convertToModelMessages(uiMessages),
        providerOptions: {
          google: {
            thinkingConfig: thinkingEnabled ? {
              thinkingBudget: 8192,
              includeThoughts: true,
            } : undefined,
          },
        },
        tools: {
          // Direct response tool (chat handles it)
          respondDirectly: tool({
            description: 'Respond directly to the user without using specialized agents',
            parameters: z.object({
              response: z.string().describe('Your response to the user'),
            }),
            execute: async ({ response }) => {
              // Stream response directly
              dataStream.write({
                type: 'text',
                text: response,
              });
              return { success: true };
            },
          }),

          // Document Agent (handles text and sheets)
          documentAgent: tool({
            description: 'Create or update text documents, reports, and spreadsheets. Use this for essays, articles, documentation, CSV data, etc.',
            parameters: z.object({
              action: z.enum(['create', 'update']),
              kind: z.enum(['text', 'sheet']).describe('Type of document to create'),
              title: z.string().optional().describe('Document title for new documents'),
              prompt: z.string().optional().describe('Instruction for content generation'),
              inputContent: z.string().optional().describe('Pre-generated content to inject directly (if chat agent already generated it)'),
              artifactId: z.string().optional().describe('Document ID for updates'),
              updateInstructions: z.string().optional().describe('Instructions for updating existing document'),
              lineRange: z.object({
                start: z.number(),
                end: z.number(),
              }).optional().describe('Specific line range to update'),
              fileContext: z.string().optional().describe('Content from uploaded files'),
            }),
            execute: async ({ action, kind, title, prompt, inputContent, artifactId, updateInstructions, lineRange, fileContext }) => {
              const documentAgent = new GoogleDocumentAgent(configs.documentAgent);

              // Add file context to prompt if available
              const fullPrompt = fileContext ? `${prompt}\n\n${fileContext}` : prompt;
              const fullUpdateInstructions = fileContext ? `${updateInstructions}\n\n${fileContext}` : updateInstructions;

              if (action === 'create') {
                if (inputContent) {
                  // Chat agent pre-generated content, just inject it
                  return await documentAgent.injectDocument({
                    title: title || 'Untitled Document',
                    content: inputContent,
                    kind,
                    dataStream,
                    user,
                    chatId: id,
                  });
                } else {
                  // Agent generates content
                  return await documentAgent.createDocument({
                    title: title || 'Untitled Document',
                    prompt: fullPrompt!,
                    kind,
                    dataStream,
                    user,
                    chatId: id,
                  });
                }
              } else {
                // Update existing document
                return await documentAgent.updateDocument({
                  documentId: artifactId!,
                  updatePrompt: inputContent || fullUpdateInstructions!,
                  isPreGenerated: !!inputContent,
                  lineRange,
                  dataStream,
                  user,
                  chatId: id,
                });
              }
            },
          }),

          // Python Code Agent
          pythonCodeAgent: tool({
            description: 'Generate or edit Python code for data analysis, scripts, and programming tasks. Use this when the user explicitly wants to write, create, or generate code.',
            parameters: z.object({
              action: z.enum(['create', 'update']),
              title: z.string().optional().describe('Code title for new code'),
              prompt: z.string().optional().describe('Instruction for code generation'),
              inputCode: z.string().optional().describe('Pre-generated code to inject directly'),
              artifactId: z.string().optional().describe('Code artifact ID for updates'),
              updateInstructions: z.string().optional().describe('Instructions for updating code'),
              lineRange: z.object({
                start: z.number(),
                end: z.number(),
              }).optional().describe('Specific line range to update'),
              fileContext: z.string().optional().describe('Content from uploaded files'),
            }),
            execute: async ({ action, title, prompt, inputCode, artifactId, updateInstructions, lineRange, fileContext }) => {
              const pythonAgent = new GooglePythonAgent(configs.pythonAgent);

              const fullPrompt = fileContext ? `${prompt}\n\n${fileContext}` : prompt;
              const fullUpdateInstructions = fileContext ? `${updateInstructions}\n\n${fileContext}` : updateInstructions;

              if (action === 'create') {
                if (inputCode) {
                  return await pythonAgent.injectCode({
                    title: title || 'Python Code',
                    code: inputCode,
                    dataStream,
                    user,
                    chatId: id,
                  });
                } else {
                  return await pythonAgent.createCode({
                    title: title || 'Python Code',
                    prompt: fullPrompt!,
                    dataStream,
                    user,
                    chatId: id,
                  });
                }
              } else {
                return await pythonAgent.updateCode({
                  documentId: artifactId!,
                  updatePrompt: inputCode || fullUpdateInstructions!,
                  isPreGenerated: !!inputCode,
                  lineRange,
                  dataStream,
                  user,
                  chatId: id,
                });
              }
            },
          }),

          // Mermaid Code Agent
          mermaidCodeAgent: tool({
            description: 'Create or edit Mermaid diagrams, flowcharts, and visualizations using Mermaid syntax.',
            parameters: z.object({
              action: z.enum(['create', 'update']),
              title: z.string().optional().describe('Diagram title'),
              prompt: z.string().optional().describe('Instruction for diagram generation'),
              inputDiagram: z.string().optional().describe('Pre-generated Mermaid code to inject directly'),
              artifactId: z.string().optional().describe('Diagram artifact ID for updates'),
              updateInstructions: z.string().optional().describe('Instructions for updating diagram'),
              lineRange: z.object({
                start: z.number(),
                end: z.number(),
              }).optional().describe('Specific line range to update'),
              fileContext: z.string().optional().describe('Content from uploaded files'),
            }),
            execute: async ({ action, title, prompt, inputDiagram, artifactId, updateInstructions, lineRange, fileContext }) => {
              const mermaidAgent = new GoogleMermaidAgent(configs.mermaidAgent);

              const fullPrompt = fileContext ? `${prompt}\n\n${fileContext}` : prompt;
              const fullUpdateInstructions = fileContext ? `${updateInstructions}\n\n${fileContext}` : updateInstructions;

              if (action === 'create') {
                if (inputDiagram) {
                  return await mermaidAgent.injectDiagram({
                    title: title || 'Mermaid Diagram',
                    diagram: inputDiagram,
                    dataStream,
                    user,
                    chatId: id,
                  });
                } else {
                  return await mermaidAgent.createDiagram({
                    title: title || 'Mermaid Diagram',
                    prompt: fullPrompt!,
                    dataStream,
                    user,
                    chatId: id,
                  });
                }
              } else {
                return await mermaidAgent.updateDiagram({
                  documentId: artifactId!,
                  updatePrompt: inputDiagram || fullUpdateInstructions!,
                  isPreGenerated: !!inputDiagram,
                  lineRange,
                  dataStream,
                  user,
                  chatId: id,
                });
              }
            },
          }),

          // Provider Tools Agent
          providerToolsAgent: tool({
            description: 'Access external APIs and services: Google Search for web information, Code Execution for quick calculations and output (use when user says "calculate", "what is", or "run this")',
            parameters: z.object({
              tool: z.enum(['google_search', 'code_execution']),
              query: z.string().optional().describe('Search query for Google Search'),
              code: z.string().optional().describe('Python code to execute for output'),
            }),
            execute: async ({ tool, query, code }) => {
              const providerToolsAgent = new GoogleProviderToolsAgent(configs.providerTools);

              if (tool === 'google_search') {
                return await providerToolsAgent.search({
                  query: query!,
                  dataStream,
                });
              } else {
                return await providerToolsAgent.executeCode({
                  code: code!,
                  dataStream,
                });
              }
            },
          }),
        },
        onFinish: async ({ usage }) => {
          // Track usage
          try {
            const providers = await getTokenlensCatalog();
            const modelId = selectedChatModel;

            if (providers) {
              const summary = getUsage({ modelId, usage, providers });
              finalMergedUsage = { ...usage, ...summary, modelId } as AppUsage;
            } else {
              finalMergedUsage = usage;
            }

            dataStream.write({ type: "data-usage", data: finalMergedUsage });
          } catch (err) {
            console.warn("TokenLens enrichment failed", err);
            finalMergedUsage = usage;
            dataStream.write({ type: "data-usage", data: finalMergedUsage });
          }
        },
      });

      result.consumeStream();

      // ... rest of existing stream handling code ...
    },
  });

  // ... rest of existing route code ...
}

// NEW: Helper function to extract file content
async function extractFileContent(attachment: Attachment): Promise<string> {
  // Implementation depends on attachment structure
  // For now, assuming attachment has a URL or base64 data

  if (attachment.contentType?.startsWith('image/')) {
    return `[Image: ${attachment.name}]`;
  }

  if (attachment.contentType === 'application/pdf') {
    // Use PDF parser
    return `[PDF content from ${attachment.name}]`;
  }

  if (attachment.contentType?.includes('text') ||
      attachment.contentType?.includes('json') ||
      attachment.contentType?.includes('code')) {
    // Read text content
    return attachment.content || attachment.url || '';
  }

  return `[File: ${attachment.name}]`;
}
```

---

### 1.4 Implement Document Agent

**File**: `code-chatbot/lib/ai/providers/google/document-agent.ts`

```typescript
import "server-only";

import { google } from '@ai-sdk/google';
import { streamText, streamObject, smoothStream, type LanguageModel, type UIMessageStreamWriter } from 'ai';
import type { User } from '@supabase/supabase-js';
import { z } from 'zod';
import { saveDocument, getDocumentById } from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';
import { sheetPrompt, updateDocumentPrompt } from '@/lib/ai/prompts';
import type { ChatMessage } from '@/lib/types';
import type { DocumentAgentConfig, ModelConfig } from '../../core/types';
import { ProviderError, AgentError, ErrorCodes } from '../../core/errors';

export class GoogleDocumentAgent {
  private config: DocumentAgentConfig;

  constructor(config: DocumentAgentConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Create a new document artifact by generating content
   */
  async createDocument(params: {
    title: string;
    prompt: string;
    kind: 'text' | 'sheet';
    dataStream: UIMessageStreamWriter<ChatMessage>;
    user: User | null;
    chatId: string;
  }): Promise<{ documentId: string; content: string }> {
    const documentId = generateUUID();

    // Write artifact metadata to stream
    params.dataStream.write({ type: "data-kind", data: params.kind, transient: true });
    params.dataStream.write({ type: "data-id", data: documentId, transient: true });
    params.dataStream.write({ type: "data-title", data: params.title, transient: true });
    params.dataStream.write({ type: "data-clear", data: null, transient: true });

    const model = this.getModel(this.getDefaultModel()!.id);
    let content = '';

    if (params.kind === 'text') {
      // Generate text document
      const { fullStream } = streamText({
        model,
        system: this.config.systemPrompt,
        prompt: params.prompt,
        experimental_transform: smoothStream({ chunking: "word" }),
      });

      for await (const delta of fullStream) {
        if (delta.type === "text-delta") {
          content += delta.text;
          params.dataStream.write({
            type: "data-textDelta",
            data: delta.text,
            transient: true,
          });
        }
      }
    } else {
      // Generate sheet (CSV)
      const { fullStream } = streamObject({
        model,
        system: sheetPrompt,
        prompt: params.prompt,
        schema: z.object({
          csv: z.string().describe("CSV data"),
        }),
      });

      for await (const delta of fullStream) {
        if (delta.type === "object" && delta.object.csv) {
          content = delta.object.csv;
          params.dataStream.write({
            type: "data-sheetDelta",
            data: content,
            transient: true,
          });
        }
      }
    }

    // Save to database with version tracking
    if (params.user?.id) {
      await saveDocument({
        id: documentId,
        title: params.title,
        content,
        kind: params.kind,
        userId: params.user.id,
        chatId: params.chatId,
        metadata: {
          agentUsed: 'document',
          updateType: 'full',
        },
      });
    }

    params.dataStream.write({ type: "data-finish", data: null, transient: true });

    return { documentId, content };
  }

  /**
   * Inject pre-generated content into a new artifact
   */
  async injectDocument(params: {
    title: string;
    content: string;
    kind: 'text' | 'sheet';
    dataStream: UIMessageStreamWriter<ChatMessage>;
    user: User | null;
    chatId: string;
  }): Promise<{ documentId: string; content: string }> {
    const documentId = generateUUID();

    // Write artifact metadata to stream
    params.dataStream.write({ type: "data-kind", data: params.kind, transient: true });
    params.dataStream.write({ type: "data-id", data: documentId, transient: true });
    params.dataStream.write({ type: "data-title", data: params.title, transient: true });
    params.dataStream.write({ type: "data-clear", data: null, transient: true });

    // Stream the pre-generated content
    const deltaType = params.kind === 'text' ? 'data-textDelta' : 'data-sheetDelta';
    params.dataStream.write({
      type: deltaType,
      data: params.content,
      transient: true,
    });

    // Save to database
    if (params.user?.id) {
      await saveDocument({
        id: documentId,
        title: params.title,
        content: params.content,
        kind: params.kind,
        userId: params.user.id,
        chatId: params.chatId,
        metadata: {
          agentUsed: 'document',
          updateType: 'injection',
        },
      });
    }

    params.dataStream.write({ type: "data-finish", data: null, transient: true });

    return { documentId, content: params.content };
  }

  /**
   * Update an existing document artifact
   */
  async updateDocument(params: {
    documentId: string;
    updatePrompt: string;
    isPreGenerated: boolean;
    lineRange?: { start: number; end: number };
    dataStream: UIMessageStreamWriter<ChatMessage>;
    user: User | null;
    chatId: string;
  }): Promise<{ documentId: string; content: string }> {
    const document = await getDocumentById({ id: params.documentId });

    if (!document) {
      throw new Error('Document not found');
    }

    params.dataStream.write({ type: "data-clear", data: null, transient: true });

    let content = '';

    if (params.isPreGenerated) {
      // Chat agent already generated the content, just inject it
      if (params.lineRange) {
        // Replace specific lines
        const lines = (document.content || '').split('\n');
        const newLines = params.updatePrompt.split('\n');
        lines.splice(params.lineRange.start - 1, params.lineRange.end - params.lineRange.start + 1, ...newLines);
        content = lines.join('\n');
      } else {
        // Full replacement
        content = params.updatePrompt;
      }

      const deltaType = document.kind === 'text' ? 'data-textDelta' : 'data-sheetDelta';
      params.dataStream.write({
        type: deltaType,
        data: content,
        transient: true,
      });
    } else {
      // Generate updated content
      const model = this.getModel(this.getDefaultModel()!.id);

      let prompt = `Current content:\n\n${document.content}\n\n`;

      if (params.lineRange) {
        const lines = (document.content || '').split('\n');
        const targetLines = lines.slice(params.lineRange.start - 1, params.lineRange.end).join('\n');
        prompt += `Update lines ${params.lineRange.start} to ${params.lineRange.end}:\n${targetLines}\n\n`;
      }

      prompt += `Update instructions: ${params.updatePrompt}\n\nProvide the complete updated content.`;

      if (document.kind === 'text') {
        const { fullStream } = streamText({
          model,
          system: updateDocumentPrompt(document.content, 'text'),
          prompt,
          experimental_transform: smoothStream({ chunking: "word" }),
        });

        for await (const delta of fullStream) {
          if (delta.type === "text-delta") {
            content += delta.text;
            params.dataStream.write({
              type: "data-textDelta",
              data: delta.text,
              transient: true,
            });
          }
        }
      } else {
        // Sheet update
        const { fullStream } = streamObject({
          model,
          system: updateDocumentPrompt(document.content, 'sheet'),
          prompt,
          schema: z.object({
            csv: z.string(),
          }),
        });

        for await (const delta of fullStream) {
          if (delta.type === "object" && delta.object.csv) {
            content = delta.object.csv;
            params.dataStream.write({
              type: "data-sheetDelta",
              data: content,
              transient: true,
            });
          }
        }
      }
    }

    // Save new version to database
    if (params.user?.id) {
      await saveDocument({
        id: params.documentId,
        title: document.title,
        content,
        kind: document.kind as 'text' | 'sheet',
        userId: params.user.id,
        chatId: params.chatId,
        parentVersionId: document.id,
        metadata: {
          agentUsed: 'document',
          updateType: params.lineRange ? 'partial' : 'full',
          lineRange: params.lineRange,
        },
      });
    }

    params.dataStream.write({ type: "data-finish", data: null, transient: true });

    return { documentId: params.documentId, content };
  }

  // ... existing methods (getModel, validateConfig, etc.) ...

  private getModel(modelId: string): LanguageModel {
    const modelConfig = this.getModelConfig(modelId);

    if (!modelConfig) {
      throw new ProviderError(
        'google',
        ErrorCodes.MODEL_NOT_FOUND,
        `Model ${modelId} not found in configuration`
      );
    }

    if (!modelConfig.enabled) {
      throw new ProviderError(
        'google',
        ErrorCodes.MODEL_DISABLED,
        `Model ${modelId} is disabled`
      );
    }

    return google(modelId);
  }

  private getModelConfig(modelId: string): ModelConfig | undefined {
    return this.config.availableModels.find(model => model.id === modelId);
  }

  getDefaultModel(): ModelConfig | null {
    const availableModels = this.config.availableModels.filter(model => model.enabled);
    return availableModels.find(model => model.isDefault) || availableModels[0] || null;
  }

  private validateConfig(): void {
    if (!this.config || !this.config.enabled) {
      throw new AgentError(
        'google-document',
        ErrorCodes.AGENT_DISABLED,
        'Document agent is disabled'
      );
    }

    if (!this.config.availableModels || this.config.availableModels.length === 0) {
      throw new AgentError(
        'google-document',
        ErrorCodes.INVALID_CONFIGURATION,
        'No models configured for document agent'
      );
    }
  }
}
```

---

### 1.5 Implement Python Agent

**File**: `code-chatbot/lib/ai/providers/google/python-agent.ts`

Similar structure to Document Agent, with these key differences:

```typescript
// Key differences:
// 1. Always uses streamObject with schema { code: z.string() }
// 2. Uses 'python code' as kind
// 3. Streams 'data-codeDelta' instead of 'data-textDelta'
// 4. Uses codePrompt system message

export class GooglePythonAgent {
  // ... same structure as DocumentAgent ...

  async createCode(params: {
    title: string;
    prompt: string;
    dataStream: UIMessageStreamWriter<ChatMessage>;
    user: User | null;
    chatId: string;
  }): Promise<{ documentId: string; code: string }> {
    const documentId = generateUUID();

    params.dataStream.write({ type: "data-kind", data: "code", transient: true });
    params.dataStream.write({ type: "data-id", data: documentId, transient: true });
    params.dataStream.write({ type: "data-title", data: params.title, transient: true });
    params.dataStream.write({ type: "data-clear", data: null, transient: true });

    const model = this.getModel(this.getDefaultModel()!.id);
    let code = '';

    const { fullStream } = streamObject({
      model,
      system: codePrompt, // From lib/ai/prompts.ts
      prompt: params.prompt,
      schema: z.object({
        code: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      if (delta.type === "object" && delta.object.code) {
        code = delta.object.code;
        params.dataStream.write({
          type: "data-codeDelta",
          data: code,
          transient: true,
        });
      }
    }

    if (params.user?.id) {
      await saveDocument({
        id: documentId,
        title: params.title,
        content: code,
        kind: 'python code',
        userId: params.user.id,
        chatId: params.chatId,
        metadata: {
          agentUsed: 'python',
          updateType: 'full',
        },
      });
    }

    params.dataStream.write({ type: "data-finish", data: null, transient: true });

    return { documentId, code };
  }

  async injectCode(params: {
    title: string;
    code: string;
    dataStream: UIMessageStreamWriter<ChatMessage>;
    user: User | null;
    chatId: string;
  }): Promise<{ documentId: string; code: string }> {
    // Same as DocumentAgent.injectDocument but with 'python code' kind
    // ...
  }

  async updateCode(params: {
    documentId: string;
    updatePrompt: string;
    isPreGenerated: boolean;
    lineRange?: { start: number; end: number };
    dataStream: UIMessageStreamWriter<ChatMessage>;
    user: User | null;
    chatId: string;
  }): Promise<{ documentId: string; code: string }> {
    // Same as DocumentAgent.updateDocument but:
    // - Uses streamObject with code schema
    // - Streams 'data-codeDelta'
    // - Kind is 'python code'
    // ...
  }
}
```

---

### 1.6 Implement Mermaid Agent

**File**: `code-chatbot/lib/ai/providers/google/mermaid-agent.ts`

Same structure as Python Agent but:
- Kind is `'mermaid code'`
- Uses Mermaid-specific system prompt
- Still streams `'data-codeDelta'` (can reuse code artifact client)

---

### 1.7 Implement Provider Tools Agent

**File**: `code-chatbot/lib/ai/providers/google/provider-tools-agent.ts`

```typescript
import "server-only";

import { google } from '@ai-sdk/google';
import { streamText, type LanguageModel, type UIMessageStreamWriter } from 'ai';
import type { ChatMessage } from '@/lib/types';
import type { ProviderToolsAgentConfig, ModelConfig } from '../../core/types';
import { ProviderError, AgentError, ErrorCodes } from '../../core/errors';

export class GoogleProviderToolsAgent {
  private config: ProviderToolsAgentConfig;

  constructor(config: ProviderToolsAgentConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Execute Google Search
   */
  async search(params: {
    query: string;
    dataStream: UIMessageStreamWriter<ChatMessage>;
  }): Promise<{ results: string; sources: any[] }> {
    const model = this.getModel(this.getDefaultModel()!.id);

    const { text, sources, fullStream } = streamText({
      model,
      tools: {
        google_search: google.tools.googleSearch({}),
      },
      prompt: params.query,
      maxSteps: 5,
    });

    // Stream results as they come in
    for await (const chunk of fullStream) {
      if (chunk.type === 'text-delta') {
        params.dataStream.write({
          type: 'text',
          text: chunk.text,
        });
      }
    }

    const finalText = await text;
    const finalSources = await sources;

    return {
      results: finalText,
      sources: finalSources || [],
    };
  }

  /**
   * Execute code for output only (not for artifact creation)
   */
  async executeCode(params: {
    code: string;
    dataStream: UIMessageStreamWriter<ChatMessage>;
  }): Promise<{ output: string }> {
    const model = this.getModel(this.getDefaultModel()!.id);

    const { text, fullStream } = streamText({
      model,
      tools: {
        code_execution: google.tools.codeExecution({}),
      },
      prompt: `Execute this code and return the output:\n\n\`\`\`python\n${params.code}\n\`\`\``,
      maxSteps: 3,
    });

    // Stream output
    for await (const chunk of fullStream) {
      if (chunk.type === 'text-delta') {
        params.dataStream.write({
          type: 'text',
          text: chunk.text,
        });
      }
    }

    const finalText = await text;

    return { output: finalText };
  }

  // ... getModel, validateConfig methods same as other agents ...
}
```

---

### 1.8 Create Config Loader

**File**: `code-chatbot/lib/ai/config-loader.ts`

```typescript
import "server-only";

import { createClient } from '@/lib/db/server';

export interface AgentConfigs {
  chatAgent: any;
  documentAgent: any;
  pythonAgent: any;
  mermaidAgent: any;
  providerTools: any;
  gitMcp: any;
}

export async function loadGoogleAgentConfigs(): Promise<AgentConfigs> {
  const supabase = await createClient();

  const configKeys = [
    'chat_model_agent_google',
    'document_agent_google',
    'python_agent_google',
    'mermaid_agent_google',
    'provider_tools_agent_google',
    'git_mcp_agent_google',
  ];

  const { data, error } = await supabase
    .from('admin_config')
    .select('config_key, config_data')
    .in('config_key', configKeys);

  if (error) {
    throw new Error(`Failed to load agent configs: ${error.message}`);
  }

  const configMap = new Map(data.map(c => [c.config_key, c.config_data]));

  return {
    chatAgent: configMap.get('chat_model_agent_google'),
    documentAgent: configMap.get('document_agent_google'),
    pythonAgent: configMap.get('python_agent_google'),
    mermaidAgent: configMap.get('mermaid_agent_google'),
    providerTools: configMap.get('provider_tools_agent_google'),
    gitMcp: configMap.get('git_mcp_agent_google'),
  };
}
```

---

### 1.9 Update Prompts

**File**: `code-chatbot/lib/ai/prompts.ts`

Add Mermaid prompt:

```typescript
export const mermaidPrompt = `
You are a Mermaid diagram specialist. Create clear, well-structured diagrams using proper Mermaid syntax.

Focus on:
1. Using the appropriate diagram type (flowchart, sequence, class, state, etc.)
2. Clear node labels and relationships
3. Proper syntax and formatting
4. Readable layout with good spacing
5. Meaningful connections and arrows

Common diagram types:
- Flowchart: \`graph TD\` or \`graph LR\`
- Sequence: \`sequenceDiagram\`
- Class: \`classDiagram\`
- State: \`stateDiagram-v2\`
- ER: \`erDiagram\`
- Gantt: \`gantt\`

Ensure all syntax is valid and the diagram will render correctly.
`;

export const updateMermaidPrompt = (currentDiagram: string | null): string => {
  return `You are updating an existing Mermaid diagram.

Current diagram:
\`\`\`mermaid
${currentDiagram || '(empty)'}
\`\`\`

Follow the same diagram type and style. Ensure all changes maintain valid Mermaid syntax.
`;
};
```

Update chat agent system prompt:

```typescript
export const chatAgentSystemPrompt = `
You are a helpful AI assistant powered by Google Gemini. Be concise, accurate, and friendly.

You have access to specialized agents for different tasks:

1. **Document Agent**: For creating/editing text documents and spreadsheets
   - Use for: essays, articles, reports, documentation, CSV data, tables
   - Can generate content or you can provide pre-written content

2. **Python Agent**: For creating/editing Python code artifacts
   - Use for: scripts, data analysis code, algorithms, functions
   - Only use when user explicitly wants to write, create, or generate code
   - Can generate code or you can provide pre-written code
   - Supports line-range updates for targeted edits

3. **Mermaid Agent**: For creating/editing diagrams and flowcharts
   - Use for: flowcharts, sequence diagrams, class diagrams, visualizations
   - Uses Mermaid syntax
   - Supports line-range updates

4. **Provider Tools Agent**: For external data and quick calculations
   - **Google Search**: Use when user asks about current events, facts, or needs web information
   - **Code Execution**: Use ONLY when user says "calculate", "what is", or "run this" for quick output
   - DO NOT use code execution for creating reusable code (use Python Agent instead)

## Decision Logic

When responding to user requests, decide:

1. **Direct Response**: Answer directly if it's a simple question or conversation
2. **Delegate to Specialized Agent**:
   - If creating/editing documents/sheets → Document Agent
   - If explicitly writing code for reuse → Python Agent
   - If creating diagrams → Mermaid Agent
   - If searching web or quick calculation → Provider Tools Agent

## Content Generation vs. Injection

You can either:
- **Generate**: Pass a prompt to the agent and let it generate content
- **Inject**: Generate the content yourself and pass it to the agent for artifact creation

Choose injection when:
- You want more control over the output format
- The content is straightforward (like simple lists, tables)
- You're already composing the response

Choose generation when:
- The content is complex (long essays, detailed code)
- You want to leverage the specialized agent's expertise
- The prompt requires domain-specific knowledge

## Line-Range Updates

For code and diagram updates, you can specify line ranges for targeted edits:
- Use when the user requests changes to specific sections
- Provide start and end line numbers
- The full updated content will still be provided, but metadata tracks the intent

Remember: Be helpful, accurate, and choose the right tool for each task!
`;
```

---

## Phase 2: Client-Side Updates

### 2.1 Add Mermaid Artifact Client

**File**: `code-chatbot/artifacts/mermaid/client.tsx`

```typescript
import { toast } from "sonner";
import { Artifact } from "@/components/create-artifact";
import {
  CopyIcon,
  RedoIcon,
  UndoIcon,
} from "@/components/icons";
import { MermaidViewer } from "@/components/mermaid-viewer";

export const mermaidArtifact = new Artifact<"mermaid code", {}>({
  kind: "mermaid code",
  description: "Useful for creating diagrams, flowcharts, and visualizations using Mermaid syntax.",

  initialize: ({ setMetadata }) => {
    setMetadata({});
  },

  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === "data-codeDelta") {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data,
        isVisible:
          draftArtifact.status === "streaming" &&
          draftArtifact.content.length > 200 &&
          draftArtifact.content.length < 210
            ? true
            : draftArtifact.isVisible,
        status: "streaming",
      }));
    }
  },

  content: ({ content, isLoading }) => {
    if (isLoading) {
      return <div>Loading diagram...</div>;
    }

    return (
      <div className="px-4 py-8">
        <MermaidViewer content={content} />
      </div>
    );
  },

  actions: [
    {
      icon: <UndoIcon size={18} />,
      description: "View Previous version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("prev");
      },
      isDisabled: ({ currentVersionIndex }) => currentVersionIndex === 0,
    },
    {
      icon: <RedoIcon size={18} />,
      description: "View Next version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("next");
      },
      isDisabled: ({ isCurrentVersion }) => isCurrentVersion,
    },
    {
      icon: <CopyIcon size={18} />,
      description: "Copy Mermaid code",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied to clipboard!");
      },
    },
  ],

  toolbar: [],
});
```

**File**: `code-chatbot/components/mermaid-viewer.tsx`

```typescript
"use client";

import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidViewerProps {
  content: string;
}

export function MermaidViewer({ content }: MermaidViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !content) return;

    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
    });

    const renderDiagram = async () => {
      try {
        const { svg } = await mermaid.render('mermaid-diagram', content);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (error) {
        console.error('Mermaid rendering error:', error);
        if (containerRef.current) {
          containerRef.current.innerHTML = `<div class="text-red-500">Error rendering diagram: ${error.message}</div>`;
        }
      }
    };

    renderDiagram();
  }, [content]);

  return <div ref={containerRef} className="mermaid-container" />;
}
```

Update `components/artifact.tsx` to include mermaid:

```typescript
import { mermaidArtifact } from "@/artifacts/mermaid/client";

export const artifactDefinitions = [
  textArtifact,
  codeArtifact,
  imageArtifact,
  sheetArtifact,
  mermaidArtifact, // ADD THIS
];
```

### 2.2 Add Thinking Mode Toggle

**File**: `code-chatbot/components/multimodal-input.tsx`

Add state and UI for thinking mode:

```typescript
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Add to component state
const [thinkingEnabled, setThinkingEnabled] = useState(false);

// Add to JSX (before the send button)
<div className="flex items-center space-x-2">
  <Switch
    id="thinking-mode"
    checked={thinkingEnabled}
    onCheckedChange={setThinkingEnabled}
  />
  <Label htmlFor="thinking-mode">Thinking Mode</Label>
</div>

// Pass to sendMessage
sendMessage({
  ...message,
  experimental_attachments: attachments,
  thinkingEnabled, // ADD THIS
});
```

---

## Error Handling Strategy

### No Retry Logic - User Manual Retry

Based on your decision, we will NOT implement automatic retry logic. Instead:

```typescript
// In each agent method
try {
  // Agent operation
  return await someOperation();
} catch (error) {
  console.error(`Agent operation failed:`, error);

  // Write error to data stream
  params.dataStream.write({
    type: 'error',
    error: {
      message: error.message,
      code: 'AGENT_FAILED',
    },
  });

  // Throw error to stop execution
  throw new AgentError(
    'agent-name',
    ErrorCodes.OPERATION_FAILED,
    `Operation failed: ${error.message}`,
    error
  );
}
```

The user will see the error and can choose to retry manually by resending their message.

---

## Testing Strategy

### Unit Tests

Create test files for each agent:

**File**: `code-chatbot/lib/ai/providers/google/__tests__/document-agent.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { GoogleDocumentAgent } from '../document-agent';

describe('GoogleDocumentAgent', () => {
  const mockConfig = {
    enabled: true,
    systemPrompt: 'Test prompt',
    availableModels: [
      {
        id: 'gemini-2.0-flash',
        enabled: true,
        isDefault: true,
      },
    ],
  };

  it('should create a text document', async () => {
    const agent = new GoogleDocumentAgent(mockConfig);
    const mockStream = { write: vi.fn() };

    const result = await agent.createDocument({
      title: 'Test Doc',
      prompt: 'Write a test',
      kind: 'text',
      dataStream: mockStream as any,
      user: { id: 'user-1' } as any,
      chatId: 'chat-1',
    });

    expect(result.documentId).toBeDefined();
    expect(result.content).toBeDefined();
    expect(mockStream.write).toHaveBeenCalled();
  });

  // More tests...
});
```

### Integration Tests

Test full workflows:

```typescript
describe('Multi-Agent Workflow', () => {
  it('should create document via chat agent delegation', async () => {
    // 1. User sends message: "Write an essay about AI"
    // 2. Chat agent receives message
    // 3. Chat agent delegates to Document Agent
    // 4. Document Agent generates content
    // 5. Artifact is created and streamed to client
    // 6. Chat agent receives completion
    // 7. Response is sent to user
  });
});
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Run database migration `0007_enhanced_document_versioning.sql`
- [ ] Verify all agent configs exist in `admin_config` table
- [ ] Test file upload and processing
- [ ] Test thinking mode toggle
- [ ] Test all artifact types (text, sheet, python, mermaid)
- [ ] Test line-range updates
- [ ] Test Provider Tools (search, code execution)
- [ ] Verify version history tracking
- [ ] Test error scenarios

### Feature Flag Setup

Add to `.env`:

```
ENABLE_MULTI_AGENT_GOOGLE=false
```

Update chat route:

```typescript
const USE_MULTI_AGENT = process.env.ENABLE_MULTI_AGENT_GOOGLE === 'true';

if (USE_MULTI_AGENT && selectedChatModel.startsWith('gemini')) {
  // Use new streamObject implementation
} else {
  // Use existing streamText implementation
}
```

### Gradual Rollout

1. **Phase 1**: Enable for internal testing (1 week)
2. **Phase 2**: Enable for 10% of users (1 week)
3. **Phase 3**: Enable for 50% of users (1 week)
4. **Phase 4**: Enable for 100% of users
5. **Phase 5**: Remove old implementation

---

## Timeline (Updated)

### Week 1: Database & Core Agents
- Day 1: Update migration files (`0001_tables.sql`, `0003_indexes.sql`)
- Day 2: Update `lib/db/queries.ts` and test with `npm run db:reset`
- Day 3-4: Document Agent implementation
- Day 5: Python Agent implementation

### Week 2: Remaining Agents & Integration
- Day 1: Mermaid Agent implementation
- Day 2: Provider Tools Agent implementation
- Day 3: Chat route integration with streamObject
- Day 4: Config loader and file processing
- Day 5: Testing and bug fixes

### Week 3: Client-Side & Polish
- Day 1: Mermaid artifact client
- Day 2: Thinking mode toggle
- Day 3: Integration testing
- Day 4: Performance optimization
- Day 5: Documentation

### Week 4: Deployment
- Day 1-2: Internal testing
- Day 3: Feature flag setup
- Day 4-5: Gradual rollout monitoring

**Total**: 4 weeks for full implementation and deployment

---

## Summary of Changes from Original Plan

### Confirmed Decisions
1. ✅ **Enhanced Database Schema**: Version tracking from day 1
2. ✅ **Mermaid as separate kind**: `'mermaid code'` (not `'image'`)
3. ✅ **Line-range updates**: Chat model decides, supported in all code agents
4. ✅ **Code execution logic**: Clear separation (Provider Tools vs Python Agent)
5. ✅ **No Git MCP**: Config kept, implementation skipped
6. ✅ **User-toggleable thinking**: UI switch for thinking mode
7. ✅ **No Gemini image gen**: Only matplotlib via Pyodide
8. ✅ **No retry logic**: User manually retries on error
9. ✅ **Document Agent handles sheets**: No separate sheet agent
10. ✅ **Chat agent processes files**: Extracts content, passes to agents

### New Features Added
- `injectDocument()`, `injectCode()`, `injectDiagram()` methods for pre-generated content
- `isPreGenerated` parameter to distinguish chat-generated vs agent-generated content
- `fileContext` parameter for passing uploaded file contents
- `metadata` field in Document table for tracking update types and line ranges
- Mermaid artifact client and viewer component

### Simplified Areas
- No circuit breaker fallback (fail fast instead)
- No retry logic (manual retry only)
- No separate sheet agent (Document Agent handles it)

---


