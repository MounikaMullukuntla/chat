import { redirect } from "next/navigation";

export default async function ChatRootPage() {
  // Redirect to the new chat page structure
  redirect("/chat");
}
