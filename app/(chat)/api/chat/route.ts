import type { User } from "@supabase/supabase-js";
// Import simple chat agent resolver
import { ChatAgentResolver } from "@/lib/ai/chat-agent-resolver";
import {
  extractFileContent,
  validateFileAttachment,
} from "@/lib/ai/file-processing";
import {
  buildFileContext,
  getFileContextSummary,
} from "@/lib/ai/file-context-builder";
import { createAuthErrorResponse, requireAuth } from "@/lib/auth/server";
import {
  deleteChatById,
  getChatById,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from "@/lib/db/queries";
import {
  getLastDocumentInChat,
  getLatestDocumentVersionsByChat,
} from "@/lib/db/queries/document";
import { ChatSDKError } from "@/lib/errors";
import {
  ActivityCategory,
  AgentOperationCategory,
  AgentOperationType,
  AgentType,
  createCorrelationId,
  logUserActivity,
  PerformanceTracker,
  UserActivityType,
} from "@/lib/logging";
import {
  buildArtifactContext,
  convertToUIMessages,
  generateUUID,
} from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

export async function POST(request: Request) {
  // Create correlation ID for request tracking
  const correlationId = createCorrelationId();
  const _requestStartTime = Date.now();
  let requestBody: PostRequestBody;
  let user: User | undefined;
  let chat: Awaited<ReturnType<typeof getChatById>> | undefined;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_error) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
      thinkingEnabled = false,
    } = requestBody;

    // Authenticate user
    const authResult = await requireAuth();
    user = authResult.user;

    // Chat management
    chat = await getChatById({ id });
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

    // Build file context from ALL messages (cached files from previous uploads)
    // This retrieves files from cache or storage and builds formatted context
    const fileContext = await buildFileContext(messagesFromDb, id, user.id);

    // Get file summary for logging
    const fileSummary = getFileContextSummary(messagesFromDb);

    // Process new file attachments in current message
    const fileContexts: string[] = [];
    const fileParts = message.parts.filter((part) => part.type === "file");

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
          fileContexts.push(
            `File: ${attachment.name}\nContent:\n${fileContent}`
          );
        }
      } catch (error) {
        console.error(
          `Failed to process file ${filePart.name ?? "file"}:`,
          error
        );
      }
    }

    // Combine new files with existing file context
    const newFileContext =
      fileContexts.length > 0
        ? `\n\nNewly Attached Files:\n${fileContexts.join("\n\n")}`
        : "";

    // Get API key and validate
    const apiKey = request.headers.get("x-google-api-key");
    if (!apiKey?.trim()) {
      return new ChatSDKError("bad_request:api").toResponse();
    }

    // Get GitHub PAT (optional - for GitHub MCP agent)
    const githubPAT = request.headers.get("x-github-pat");

    // Extract file attachments for database storage
    const fileAttachments = fileParts.map((filePart: any) => ({
      url: filePart.url,
      name: filePart.name ?? "file",
      contentType: filePart.mediaType ?? "application/octet-stream",
      size: 0, // Size not available from filePart
      uploadedAt: new Date().toISOString(),
      storagePath: filePart.storagePath || "", // Use storagePath if provided
    }));

    // Save user message
    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: "user",
          parts: message.parts,
          attachments: fileAttachments,
          createdAt: new Date(),
          modelUsed: null,
          inputTokens: null,
          outputTokens: null,
          cost: null,
        },
      ],
    });

    // Log user activity - chat message sent
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: chat
        ? UserActivityType.CHAT_MESSAGE_SEND
        : UserActivityType.CHAT_CREATE,
      activity_category: ActivityCategory.CHAT,
      activity_metadata: {
        chat_id: id,
        model_selected: selectedChatModel,
        thinking_enabled: thinkingEnabled,
        file_count: fileParts.length,
        total_files_in_context: fileSummary.fileCount,
        total_file_size: fileSummary.totalSize,
        message_length: message.parts
          .filter((p: any) => p.type === "text")
          .reduce((sum: number, p: any) => sum + (p.text?.length || 0), 0),
        has_artifact_context: allArtifacts.length > 0,
        has_file_context: fileSummary.fileCount > 0,
      },
      resource_id: id,
      resource_type: "chat",
      request_path: request.url,
      request_method: "POST",
      success: true,
    });

    // Create performance tracker for AI operation
    const aiTracker = new PerformanceTracker({
      user_id: user.id,
      correlation_id: correlationId,
      agent_type: AgentType.CHAT_MODEL_AGENT,
      operation_type: AgentOperationType.STREAMING,
      operation_category: AgentOperationCategory.STREAMING,
      model_id: selectedChatModel,
      thinking_mode: thinkingEnabled,
      resource_id: id,
      resource_type: "chat",
    });

    // Create chat agent using simple resolver
    const chatAgent = await ChatAgentResolver.createChatAgent();
    chatAgent.setApiKey(apiKey);

    // Set GitHub PAT if provided (for GitHub MCP agent)
    if (githubPAT?.trim()) {
      chatAgent.setGitHubPAT(githubPAT);
      console.log("🐙 [GITHUB-PAT] GitHub PAT provided for MCP agent");
    }

      const baseMessages = uiMessages.map((msg) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant" | "system",
      content: msg.parts
        .map((part: any) => (part.type === "text" ? part.text : ""))
        .join("\n"),
    }));

    if (newFileContext && baseMessages.length > 0) {
      const lastIndex = baseMessages.length - 1;
      baseMessages[lastIndex] = {
        ...baseMessages[lastIndex],
        content: baseMessages[lastIndex].content + newFileContext,
      };
    }

    const messagesForAgent = baseMessages.filter(
      (msg) => msg.content && msg.content.trim().length > 0
    );

    console.log(
      "🧪 [/api/chat] messages passed into chatAgent.chat:",
      JSON.stringify(messagesForAgent, null, 2)
    );

    // Use chat agent to generate streaming response with all provider-specific logic
    const response = await chatAgent.chat({
      chatId: id,
      modelId: selectedChatModel,
      messages: messagesForAgent,
      artifactContext: artifactContext + fileContext,
      thinkingMode: thinkingEnabled,
      user,
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        // Save all assistant messages to database
        const assistantMessages = messages.filter(
          (msg) => msg.role === "assistant"
        );

        if (assistantMessages.length > 0) {
          console.log(
            "🔍 [FINISH] Processing",
            assistantMessages.length,
            "assistant messages"
          );

          await saveMessages({
            messages: assistantMessages.map((msg) => {
              console.log("🔍 [FINISH] Message has", msg.parts.length, "parts");

              const hasMeaningfulPart = msg.parts && msg.parts.some((part: any) => {
                if (part.type === "text") return (part.text ?? "").trim().length > 0;

                return true;
              });

              let parts = msg.parts;

              if (!hasMeaningfulPart) {
                const text = thinkingEnabled ? "The selected model does not support thinking mode. Please choose a different model or disable thinking mode."
                : "The model was unable to generate a response. Please try again with a different prompt or model.";

                console.warn(
                  "🔍 [FINISH] Replacing empty assistant message with fallback text:",
                  text
                );

                parts = [
                  {
                    type: "text",
                    text,
                  } as any
                ]
              }

              // Log message parts for debugging
              msg.parts.forEach((part: any, index: number) => {
                console.log(`🔍 [FINISH] Part ${index}: type=${part.type}`);

                if (part.type === "tool-documentAgent") {
                  const output = (part as any).output;
                  console.log(
                    "🔍 [FINISH] documentAgent output:",
                    JSON.stringify(output)
                  );
                }
              });

              return {
                id: msg.id,
                chatId: id,
                role: "assistant",
                parts: parts,
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

        // Log agent activity completion (Note: Token counts not available from chat agent interface)
        await aiTracker.end({
          success: true,
          operation_metadata: {
            message_count: assistantMessages.length,
            parts_count: assistantMessages.reduce(
              (sum, msg) => sum + msg.parts.length,
              0
            ),
          },
        });
      },
    });

    return response;
  } catch (error) {
    // Log failed user activity
    if (user) {
      await logUserActivity({
        user_id: user.id,
        correlation_id: correlationId,
        activity_type: chat
          ? UserActivityType.CHAT_MESSAGE_SEND
          : UserActivityType.CHAT_CREATE,
        activity_category: ActivityCategory.CHAT,
        success: false,
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("Unhandled error in chat API:", error);
    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const correlationId = createCorrelationId();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  // Authenticate user with Supabase
  let user: User;
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

  try {
    const deletedChat = await deleteChatById({ id });

    // Log successful chat deletion
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: UserActivityType.CHAT_DELETE,
      activity_category: ActivityCategory.CHAT,
      resource_id: id,
      resource_type: "chat",
      request_path: request.url,
      request_method: "DELETE",
      success: true,
    });

    return Response.json(deletedChat, { status: 200 });
  } catch (error) {
    // Log failed deletion
    await logUserActivity({
      user_id: user.id,
      correlation_id: correlationId,
      activity_type: UserActivityType.CHAT_DELETE,
      activity_category: ActivityCategory.CHAT,
      success: false,
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
