import { redirect } from "next/navigation";

export default function LegacyKeyPage() {
  redirect("/chat/keys/");
}
