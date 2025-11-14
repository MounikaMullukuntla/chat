"use client";

import type { User } from "@supabase/supabase-js";
import { ChevronUp, LogOut, Moon, Settings, Shield, Sun } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth, useRole } from "@/lib/auth/hooks";
import { LoaderIcon } from "./icons";
import { toast } from "./toast";

export function SidebarUserNav({ user: propUser }: { user?: User }) {
  const router = useRouter();
  const { user, loading, signOut, error } = useAuth();
  const { isAdmin, role, loading: roleLoading } = useRole();
  const { setTheme, resolvedTheme } = useTheme();

  // Use the user from auth hook if available, otherwise use prop user
  const currentUser = user || propUser;
  const status = loading ? "loading" : "authenticated";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {status === "loading" ? (
              <SidebarMenuButton className="h-10 justify-between bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                <div className="flex flex-row gap-2">
                  <div className="size-6 animate-pulse rounded-full bg-zinc-500/30" />
                  <span className="animate-pulse rounded-md bg-zinc-500/30 text-transparent">
                    Loading auth status
                  </span>
                </div>
                <div className="animate-spin text-zinc-500">
                  <LoaderIcon />
                </div>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                className="h-10 bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                data-testid="user-nav-button"
              >
                <Image
                  alt={currentUser?.email ?? "User Avatar"}
                  className="rounded-full"
                  height={24}
                  src={`https://avatar.vercel.sh/${currentUser?.email}`}
                  width={24}
                />
                <span className="truncate" data-testid="user-email">
                  {currentUser?.email ?? "User"}
                </span>
                <ChevronUp className="ml-auto" />
              </SidebarMenuButton>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-popper-anchor-width)"
            data-testid="user-nav-menu"
            side="top"
          >
            <DropdownMenuItem asChild data-testid="user-nav-item-settings">
              <Link
                className="flex cursor-pointer items-center gap-2"
                href="/settings"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild data-testid="user-nav-item-admin">
                <Link
                  className="flex cursor-pointer items-center gap-2"
                  href="/admin"
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-2"
              data-testid="user-nav-item-theme"
              onSelect={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              {`Toggle ${resolvedTheme === "light" ? "dark" : "light"} mode`}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild data-testid="user-nav-item-auth">
              <button
                className="flex w-full cursor-pointer items-center gap-2"
                onClick={async () => {
                  if (status === "loading") {
                    toast({
                      type: "error",
                      description:
                        "Checking authentication status, please try again!",
                    });
                    return;
                  }

                  if (currentUser) {
                    try {
                      await signOut();
                      router.push("/");
                    } catch (_err) {
                      toast({
                        type: "error",
                        description: "Failed to sign out. Please try again.",
                      });
                    }
                  } else {
                    router.push("/login");
                  }
                }}
                type="button"
              >
                <LogOut className="h-4 w-4" />
                {currentUser ? "Sign out" : "Login to your account"}
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
