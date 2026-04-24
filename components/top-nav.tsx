"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

interface TopNavProps {
  isWebroot: boolean;
  isLoggedIn?: boolean;
}

export function TopNav({ isWebroot, isLoggedIn = false }: TopNavProps) {
  const pathname = usePathname();
  return (
    <nav className="fixed top-0 right-0 left-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="flex w-full items-center gap-4 px-4 py-4">
        <div className="shrink-0 font-bold text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Earthscape
        </div>

        {/* Overflow container: spacer pushes buttons right; clipping from the right
            means rightmost items (Sign In, then FAQ, Agents…) disappear first. */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex flex-nowrap items-center gap-2">
            <div className="flex-1" />
            <Button asChild variant="ghost" className="shrink-0">
              <Link href="/intro">Intro</Link>
            </Button>
            <Button asChild variant="ghost" className="shrink-0">
              <Link href="/chat">Chat</Link>
            </Button>
            <Button asChild variant="ghost" className="shrink-0">
              <Link href="/features">Features</Link>
            </Button>
            <Button asChild variant="ghost" className="shrink-0">
              <Link href="/agents">Agents</Link>
            </Button>
            <Button asChild variant="ghost" className="shrink-0">
              <Link href="/faq">FAQ</Link>
            </Button>
            {isWebroot && (
              <>
                <Button asChild variant="ghost" className="shrink-0">
                  <Link href="/team">Team</Link>
                </Button>
                <Button asChild variant="ghost" className="shrink-0">
                  <Link href="/montage">Montage</Link>
                </Button>
              </>
            )}
            {!isLoggedIn && pathname !== "/login" && (
              <Button asChild variant="ghost" className="shrink-0">
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Sign Up always visible — outside the overflow container */}
        {!isLoggedIn && pathname !== "/register" && (
          <Button asChild className="shrink-0 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90">
            <Link href="/register">Sign Up</Link>
          </Button>
        )}
      </div>
    </nav>
  );
}
