"use client";

import Link from "next/link";
import { BookOpenText } from "lucide-react";
import { buildRepoWikiHref } from "@/lib/repo-wiki";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function RepoWikiLink({
  repoName,
  githubAccount,
  className,
}: {
  repoName: string;
  githubAccount?: string | null;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={buildRepoWikiHref({ repoName, githubAccount })}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            className
          )}
          aria-label={`Open ${repoName} wiki`}
          title={`Open ${repoName} wiki`}
        >
          <BookOpenText size={15} />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom">Open README wiki</TooltipContent>
    </Tooltip>
  );
}
