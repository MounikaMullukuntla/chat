/**
 * Minimal cn() utility for the standalone bundle.
 *
 * chat/lib/utils.ts is NOT imported here because it pulls in drizzle-schema,
 * ai-sdk types, error classes, and other chat-specific code that would bloat
 * (or break) the standalone bundle.  This file is wired up in tsconfig.json
 * and vite.config.ts as the alias target for "@/lib/utils".
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
