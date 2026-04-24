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
      <div className="flex w-full items-center justify-between gap-4 px-4 py-4">
        <div className="font-bold text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Earthscape
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button asChild variant="ghost">
            <Link href="/intro">Intro</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/chat">Chat</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/features">Features</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/agents">Agents</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/faq">FAQ</Link>
          </Button>
          {isWebroot && (
            <>
              <Button asChild variant="ghost">
                <Link href="/team">Team</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/montage">Montage</Link>
              </Button>
            </>
          )}
          {!isLoggedIn && pathname !== "/login" && (
            <Button asChild variant="ghost">
              <Link href="/login">Sign In</Link>
            </Button>
          )}
          {!isLoggedIn && pathname !== "/register" && (
            <Button asChild className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90">
              <Link href="/register">Sign Up</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
