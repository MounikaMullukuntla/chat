import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
// Default model constant
const DEFAULT_CHAT_MODEL = "gemini-2.0-flash";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth/server";

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic'

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  // Reject IDs that look like file paths (e.g., stackframe.js, *.map, etc.)
  if (id.includes('.') || id.includes('/')) {
    notFound();
  }

  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const user = await getCurrentUser();

  // Check if user can access this chat
  if (chat.visibility === "private") {
    if (!user) {
      return notFound();
    }

    if (user.id !== chat.user_id) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const uiMessages = convertToUIMessages(messagesFromDb);

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");

  // Determine if chat should be readonly based on user ownership
  const isReadonly = !user || user.id !== chat.user_id;

  if (!chatModelFromCookie) {
    return (
      <>
        <Chat
          autoResume={true}
          id={chat.id}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialLastContext={chat.lastContext as any ?? undefined}
          initialMessages={uiMessages}
          initialVisibilityType={chat.visibility as any}
          isReadonly={isReadonly}
        />
        <DataStreamHandler />
      </>
    );
  }

  return (
    <>
      <Chat
        autoResume={true}
        id={chat.id}
        initialChatModel={chatModelFromCookie.value}
        initialLastContext={chat.lastContext as any ?? undefined}
        initialMessages={uiMessages}
        initialVisibilityType={chat.visibility as any}
        isReadonly={isReadonly}
      />
      <DataStreamHandler />
    </>
  );
}
