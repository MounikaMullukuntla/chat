import {
  createUIMessageStream,
  JsonToSseTransformStream,
  streamText,
  stepCountIs,
} from "ai";
import { requireAuth, createAuthErrorResponse } from "@/lib/auth/server";

// Import simple chat agent resolver
import { ChatAgentResolver } from "@/lib/ai/chat-agent-resolver";
import { extractFileContent, validateFileAttachment } from "@/lib/ai/file-processing";
import {
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

// Simple streaming without Redis dependency
export function getStreamContext() {
  return null; // No resumable streams - use direct streaming
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (error) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const { id, message, selectedChatModel, selectedVisibilityType, thinkingEnabled = false } = requestBody;

    // Authenticate user
    const authResult = await requireAuth();
    const user = authResult.user;

    // Simple rate limiting - 100 messages per day for all users
    const messageCount = await getMessageCountByUserId({
      id: user.id,
      differenceInHours: 24,
    });

    if (messageCount > 100) {
      return new ChatSDKError("rate_limit:chat").toResponse();
    }

    // Chat management
    const chat = await getChatById({ id });
    if (chat) {
      if (chat.user_id !== user.id) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }
    } else {
      const title = await generateTitleFromUserMessage({ message });
      await saveChat({
        id,
        userId: user.id,
        title,
        visibility: selectedVisibilityType,
      });
    }

    // Get messages and process files
    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const fileContexts: string[] = [];
    const fileParts = message.parts.filter(part => part.type === 'file');
    
    for (const filePart of fileParts) {
      try {
        const attachment = {
          name: filePart.name ?? "file",
          url: filePart.url,
          mediaType: filePart.mediaType,
        };
        
        const validation = validateFileAttachment(attachment);
        if (validation.valid) {
          const fileContent = await extractFileContent(attachment);
          fileContexts.push(`File: ${attachment.name}\nContent:\n${fileContent}`);
        }
      } catch (error) {
        console.error(`Failed to process file ${filePart.name ?? "file"}:`, error);
      }
    }

    const fileContext = fileContexts.length > 0
      ? `\n\nAttached files:\n${fileContexts.join('\n\n')}`
      : '';

    // Get API key and validate
    const apiKey = request.headers.get('x-google-api-key');
    if (!apiKey?.trim()) {
      return new ChatSDKError("bad_request:api").toResponse();
    }

    // Save user message
    await saveMessages({
      messages: [{
        chatId: id,
        id: message.id,
        role: "user",
        parts: message.parts,
        attachments: [],
        createdAt: new Date(),
        modelUsed: null,
        inputTokens: null,
        outputTokens: null,
        cost: null,
      }],
    });

    // Create chat agent using simple resolver
    const chatAgent = await ChatAgentResolver.createChatAgent();
    chatAgent.setApiKey(apiKey);

    // Load provider tools configuration for tool integration
    await chatAgent.loadProviderToolsConfig();

    // Set the selected model for provider tools agent (same model as chat)
    chatAgent.setProviderToolsModel(selectedChatModel);

    // Check if thinking mode is supported by the selected model
    const modelSupportsThinking = chatAgent.supportsThinking(selectedChatModel);
    const shouldEnableThinking = thinkingEnabled && modelSupportsThinking;

    // Use chat agent to generate streaming response
    const chatParams = {
      modelId: selectedChatModel,
      messages: uiMessages.map(msg => ({
        id: msg.id,
        role: msg.role as "user" | "assistant" | "system",
        content: msg.parts.map(part => part.type === 'text' ? part.text : '').join('\n') + fileContext
      })),
      systemPrompt: fileContext, // Add file context to system prompt
      thinkingMode: thinkingEnabled
    };

    // Create proper UI message stream using AI SDK
    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        // Use streamText directly with Google model from chat agent
        const model = chatAgent.getModel(selectedChatModel);

        // Build system prompt with tool descriptions from chat agent
        const systemPrompt = chatAgent.buildSystemPrompt();

        // Build tools from chat agent (includes provider tools if enabled)
        const tools = chatAgent.buildTools(dataStream);

        // Configure stream with Google's thinking config if enabled
        const streamConfig: any = {
          model,
          system: systemPrompt,
          messages: chatParams.messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          temperature: 0.7,
        };

        // Add tools if available
        if (tools) {
          streamConfig.tools = tools;
          // Enable multi-step execution with stopWhen - this allows the model to:
          // 1. Call tools
          // 2. Receive tool results
          // 3. Generate a final response using those results
          streamConfig.stopWhen = stepCountIs(5); // Stop after 5 steps (tool calls + responses)
          console.log('🔧 [CHAT-ROUTE] Multi-step execution enabled with stopWhen');
        }

        // Add Google-specific thinking configuration
        if (shouldEnableThinking) {
          streamConfig.providerOptions = {
            google: {
              thinkingConfig: {
                thinkingBudget: 8192,
                includeThoughts: true,
              },
            },
          };
        }

        console.log('🚀 [CHAT-ROUTE] Starting streamText with tools:', tools ? Object.keys(tools) : 'none');
        console.log('🚀 [CHAT-ROUTE] Thinking mode enabled:', shouldEnableThinking);

        const result = streamText(streamConfig);

        // Merge the AI stream into the UI message stream with reasoning enabled
        // The AI SDK will handle tool execution and streaming automatically
        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: shouldEnableThinking,
          })
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {

        // Save all assistant messages to database
        const assistantMessages = messages.filter(msg => msg.role === 'assistant');

        if (assistantMessages.length > 0) {
          await saveMessages({
            messages: assistantMessages.map((msg) => ({
              id: msg.id,
              chatId: id,
              role: "assistant",
              parts: msg.parts,
              attachments: [],
              createdAt: new Date(),
              modelUsed: selectedChatModel,
              inputTokens: null,
              outputTokens: null,
              cost: null,
            })),
          });
        }
      },
      onError: () => {
        return "Oops, an error occurred!";
      },
    });

    // Return direct streaming response (no Redis dependency)
    return new Response(stream.pipeThrough(new JsonToSseTransformStream()), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-google-api-key',
      },
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("Unhandled error in chat API:", error);
    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  // Authenticate user with Supabase
  let user;
  try {
    const authResult = await requireAuth();
    user = authResult.user;
  } catch (error) {
    return createAuthErrorResponse(error as Error);
  }

  const chat = await getChatById({ id });

  if (chat && chat.user_id !== user.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}