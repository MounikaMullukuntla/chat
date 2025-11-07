import type { UIMessageStreamWriter } from "ai";
import type { User } from "@supabase/supabase-js";
import { getDocumentById, saveDocument } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";

export async function updateTextDocument(params: {
  documentId: string;
  content: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  user?: User | null;
  chatId?: string;
  metadata?: Record<string, any>;
}): Promise<string> {
  const { documentId, content, dataStream, user, chatId, metadata = {} } = params;
  
  // Fetch the existing document from database
  const document = await getDocumentById({ id: documentId });
  
  if (!document) {
    throw new Error(`Document with ID ${documentId} not found`);
  }

  if (document.kind !== 'text') {
    throw new Error(`Document ${documentId} is not a text document (kind: ${document.kind})`);
  }

  // Clear the artifact panel for update
  dataStream.write({
    type: "data-clear",
    data: null,
    transient: true,
  });

  // Stream the updated content to the artifact panel character-by-character
  console.log('📄 [UPDATE-STREAM] Streaming content character-by-character, total length:', content.length);

  // Stream in chunks for better performance (50 chars at a time)
  const chunkSize = 50;
  for (let i = 0; i < content.length; i += chunkSize) {
    const chunk = content.slice(i, Math.min(i + chunkSize, content.length));
    dataStream.write({
      type: "data-textDelta",
      data: chunk,
      transient: true,
    });
    // Small delay to make streaming visible
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  // Save updated document to database if user is provided
  if (user?.id) {
    await saveDocument({
      id: documentId,
      title: document.title,
      content,
      kind: "text",
      userId: user.id,
      chatId: chatId || document.chat_id || undefined,
      parentVersionId: `${document.id}`, // Link to previous version
      metadata: {
        ...metadata,
        updateType: 'update',
        agentInfo: 'document-agent',
        previousVersion: document.version_number,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  dataStream.write({
    type: "data-finish",
    data: null,
    transient: true
  });

  return documentId;
}