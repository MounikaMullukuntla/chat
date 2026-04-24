import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TopNav } from "@/components/top-nav";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sidebarCookie = cookieStore.get("sidebar_state")?.value;
  const isCollapsed = sidebarCookie === "false";
  const isWebroot = process.env.WEBROOT === "true";

  return (
    <>
      <TopNav isWebroot={isWebroot} isLoggedIn={false} />
      <SidebarProvider defaultOpen={!isCollapsed}>
        <AppSidebar isWebroot={isWebroot} />
        <SidebarInset className="pt-[73px]">{children}</SidebarInset>
      </SidebarProvider>
    </>
  );
}
