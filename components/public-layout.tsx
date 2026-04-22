import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TopNav } from "@/components/top-nav";

export async function PublicLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sidebarCookie = cookieStore.get("sidebar_state")?.value;
  const isCollapsed = sidebarCookie === "false";
  const isWebroot = process.env.WEBROOT === "true";

  let isLoggedIn = false;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    isLoggedIn = !!user;
  }

  return (
    <DataStreamProvider>
      <TopNav isWebroot={isWebroot} isLoggedIn={isLoggedIn} />
      <div className="pt-[73px]">
        <SidebarProvider defaultOpen={!isCollapsed}>
          <AppSidebar />
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
      </div>
    </DataStreamProvider>
  );
}
