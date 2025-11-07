import type { UIMessageStreamWriter } from "ai";
import type { User } from "@supabase/supabase-js";
import { saveDocument } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

export async function createTextDocument(params: {
  title: string;
  content: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  user?: User | null;
  chatId?: string;
  metadata?: Record<string, any>;
}): Promise<string> {
  const { title, content, dataStream, user, chatId, metadata = {} } = params;
  const documentId = generateUUID();

  console.log('📄 [STREAM] Starting document stream for:', title);
  console.log('📄 [STREAM] Document ID:', documentId);
  console.log('📄 [STREAM] Content length:', content.length);

  // Write artifact metadata to stream to open side panel
  console.log('📄 [STREAM] Writing data-kind: text');
  dataStream.write({
    type: "data-kind",
    data: "text",
    transient: true,
  });

  console.log('📄 [STREAM] Writing data-id:', documentId);
  dataStream.write({
    type: "data-id",
    data: documentId,
    transient: true,
  });

  console.log('📄 [STREAM] Writing data-title:', title);
  dataStream.write({
    type: "data-title",
    data: title,
    transient: true,
  });

  console.log('📄 [STREAM] Writing data-clear');
  dataStream.write({
    type: "data-clear",
    data: null,
    transient: true,
  });

  // Stream the content to the artifact panel character-by-character
  console.log('📄 [STREAM] Streaming content character-by-character, total length:', content.length);

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

  // Save document to database if user is provided
  if (user?.id) {
    console.log('📄 [STREAM] Saving to database for user:', user.id);
    await saveDocument({
      id: documentId,
      title,
      content,
      kind: "text",
      userId: user.id,
      chatId,
      metadata: {
        ...metadata,
        updateType: 'create',
        agentInfo: 'document-agent',
        createdAt: new Date().toISOString(),
      },
    });
    console.log('✅ [STREAM] Saved to database');
  } else {
    console.log('⚠️  [STREAM] No user provided, skipping database save');
  }

  console.log('📄 [STREAM] Writing data-finish');
  dataStream.write({
    type: "data-finish",
    data: null,
    transient: true
  });

  console.log('✅ [STREAM] Document stream completed');
  return documentId;
}