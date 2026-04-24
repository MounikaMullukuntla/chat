import { cookies } from "next/headers";
import type { Metadata } from "next";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TopNav } from "@/components/top-nav";

export const metadata: Metadata = { title: "API Key Settings" };

export default async function KeyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isCollapsed = cookieStore.get("sidebar_state")?.value === "false";
  const isWebroot = process.env.WEBROOT === "true";

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/icon?family=Material+Icons"
      />
      <TopNav isWebroot={isWebroot} isLoggedIn={false} />
      <SidebarProvider defaultOpen={!isCollapsed}>
        <AppSidebar isWebroot={isWebroot} />
        <SidebarInset className="pt-[73px]">{children}</SidebarInset>
      </SidebarProvider>
    </>
  );
}
