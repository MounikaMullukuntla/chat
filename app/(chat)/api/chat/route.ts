import { requireAuth, createAuthErrorResponse } from "@/lib/auth/server";
import type { UIMessagePart } from "ai";

// Import simple chat agent resolver
import { ChatAgentResolver } from "@/lib/ai/chat-agent-resolver";
import { extractFileContent, validateFileAttachment } from "@/lib/ai/file-processing";
import {
  deleteChatById,
  getChatById,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from "@/lib/db/queries";
import { getLatestDocumentVersionsByChat, getLastDocumentInChat } from "@/lib/db/queries/document";
import { ChatSDKError } from "@/lib/errors";
import { convertToUIMessages, generateUUID, buildArtifactContext } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

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

    // Fetch all artifacts in the conversation
    const allArtifacts = await getLatestDocumentVersionsByChat({ chatId: id });
    const lastDocument = await getLastDocumentInChat({ chatId: id });
    const artifactContext = buildArtifactContext(allArtifacts, lastDocument);

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

    // Use chat agent to generate streaming response with all provider-specific logic
    return await chatAgent.chat({
      chatId: id,
      modelId: selectedChatModel,
      messages: uiMessages.map(msg => ({
        id: msg.id,
        role: msg.role as "user" | "assistant" | "system",
        content: msg.parts.map((part: UIMessagePart) => part.type === 'text' ? part.text : '').join('\n') + fileContext
      })),
      artifactContext: artifactContext,
      thinkingMode: thinkingEnabled,
      user: user,
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        // Save all assistant messages to database
        const assistantMessages = messages.filter(msg => msg.role === 'assistant');

        if (assistantMessages.length > 0) {
          console.log('🔍 [FINISH] Processing', assistantMessages.length, 'assistant messages');

          await saveMessages({
            messages: assistantMessages.map((msg) => {
              console.log('🔍 [FINISH] Message has', msg.parts.length, 'parts');

              // Log message parts for debugging
              msg.parts.forEach((part, index) => {
                console.log(`🔍 [FINISH] Part ${index}: type=${part.type}`);

                if (part.type === 'tool-documentAgent') {
                  const output = (part as any).output;
                  console.log(`🔍 [FINISH] documentAgent output:`, JSON.stringify(output));
                }
              });

              return {
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
              };
            }),
          });
        }
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