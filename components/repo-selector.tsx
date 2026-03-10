"use client";

import equal from "fast-deep-equal";
import { memo } from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, GitIcon } from "./icons";

type RepoSelectorProps = {
  availableRepos: string[];
  ragSelectedRepos: string[];
  onRagSelectedReposChange: (repos: string[]) => void;
  isLoading?: boolean;
  className?: string;
};

function PureRepoSelector({
  availableRepos,
  ragSelectedRepos,
  onRagSelectedReposChange,
  isLoading = false,
  className,
}: RepoSelectorProps) {
  if (isLoading || availableRepos.length === 0) {
    return null;
  }

  // Empty array means "all repos" (no filter)
  const allSelected = ragSelectedRepos.length === 0;

  const label = allSelected
    ? "All Repos"
    : ragSelectedRepos.length === 1
      ? ragSelectedRepos[0]
      : `${ragSelectedRepos.length} Repos`;

  const handleToggleRepo = (repoName: string) => {
    if (allSelected) {
      // Switching from "all" to a specific exclusion:
      // select all repos except the toggled one
      const next = availableRepos.filter((r) => r !== repoName);
      onRagSelectedReposChange(next);
    } else {
      const isCurrentlySelected = ragSelectedRepos.includes(repoName);
      if (isCurrentlySelected) {
        const next = ragSelectedRepos.filter((r) => r !== repoName);
        // If removing the last one, revert to "all"
        onRagSelectedReposChange(next.length === 0 ? [] : next);
      } else {
        const next = [...ragSelectedRepos, repoName];
        // If selecting all repos, simplify to empty array (= all)
        onRagSelectedReposChange(
          next.length === availableRepos.length ? [] : next
        );
      }
    }
  };

  const handleSelectAll = () => {
    onRagSelectedReposChange([]);
  };

  // For display: if empty (all), every repo is "checked"
  const isRepoChecked = (repoName: string) =>
    allSelected || ragSelectedRepos.includes(repoName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg border-0 bg-transparent px-2 text-foreground shadow-none transition-colors hover:bg-accent focus:outline-none focus:ring-0",
            className
          )}
          type="button"
        >
          <GitIcon />
          <span className="hidden max-w-[100px] truncate font-medium text-xs sm:block">
            {label}
          </span>
          <ChevronDownIcon size={14} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px]">
        <DropdownMenuLabel className="text-xs">
          Filter by Repository
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={allSelected}
          onCheckedChange={handleSelectAll}
          onSelect={(e) => e.preventDefault()}
        >
          All Repos
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {availableRepos.map((repo) => (
          <DropdownMenuCheckboxItem
            key={repo}
            checked={isRepoChecked(repo)}
            onCheckedChange={() => handleToggleRepo(repo)}
            onSelect={(e) => e.preventDefault()}
          >
            {repo}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const RepoSelector = memo(
  PureRepoSelector,
  (prevProps, nextProps) => {
    if (!equal(prevProps.availableRepos, nextProps.availableRepos)) {
      return false;
    }
    if (!equal(prevProps.ragSelectedRepos, nextProps.ragSelectedRepos)) {
      return false;
    }
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }
    return true;
  }
);
