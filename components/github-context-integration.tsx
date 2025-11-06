"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, X, GitBranch, Lock, Globe, Star, GitFork } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { GitHubRepo, GitHubSearchResponse, GitHubContextState } from "@/lib/types";

interface GitHubContextIntegrationProps {
  githubPAT?: string;
  selectedRepos: GitHubRepo[];
  onRepoSelectionChange: (repos: GitHubRepo[]) => void;
  className?: string;
}

// Debounce hook for search input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function GitHubContextIntegration({
  githubPAT,
  selectedRepos,
  onRepoSelectionChange,
  className,
}: GitHubContextIntegrationProps) {
  const [state, setState] = useState<GitHubContextState>({
    searchQuery: "",
    searchResults: [],
    selectedRepos: selectedRepos,
    isLoading: false,
    error: null,
  });

  const [userRepos, setUserRepos] = useState<GitHubRepo[]>([]);
  const [loadingUserRepos, setLoadingUserRepos] = useState(false);

  // Debounce search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(state.searchQuery, 300);

  // Fetch user's repositories
  const fetchUserRepositories = useCallback(async () => {
    if (!githubPAT) return;

    setLoadingUserRepos(true);
    try {
      const response = await fetch(
        'https://api.github.com/user/repos?sort=updated&per_page=20&affiliation=owner',
        {
          headers: {
            Authorization: `token ${githubPAT}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch user repositories: ${response.status}`);
      }

      const repos: GitHubRepo[] = await response.json();
      setUserRepos(repos);
    } catch (error) {
      console.error('Failed to fetch user repositories:', error);
    } finally {
      setLoadingUserRepos(false);
    }
  }, [githubPAT]);

  // Search GitHub repositories using the GitHub API
  const searchRepositories = useCallback(async (query: string) => {
    if (!githubPAT) {
      setState(prev => ({
        ...prev,
        error: "GitHub Personal Access Token is required for repository search",
      }));
      return;
    }

    if (!query.trim()) {
      setState(prev => ({
        ...prev,
        searchResults: [],
        error: null,
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=15`,
        {
          headers: {
            Authorization: `token ${githubPAT}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid GitHub Personal Access Token");
        } else if (response.status === 403) {
          throw new Error("GitHub API rate limit exceeded. Please try again later.");
        } else {
          throw new Error(`GitHub API error: ${response.status}`);
        }
      }

      const data: GitHubSearchResponse = await response.json();
      
      setState(prev => ({
        ...prev,
        searchResults: data.items,
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to search repositories";
      setState(prev => ({
        ...prev,
        searchResults: [],
        isLoading: false,
        error: errorMessage,
      }));
      toast.error(errorMessage);
    }
  }, [githubPAT]);

  // Effect to fetch user repositories on mount
  useEffect(() => {
    if (githubPAT) {
      fetchUserRepositories();
    }
  }, [githubPAT, fetchUserRepositories]);

  // Effect to trigger search when debounced query changes
  useEffect(() => {
    searchRepositories(debouncedSearchQuery);
  }, [debouncedSearchQuery, searchRepositories]);

  // Handle repository selection/deselection
  const handleRepoToggle = useCallback((repo: GitHubRepo, isSelected: boolean) => {
    let newSelectedRepos: GitHubRepo[];
    
    if (isSelected) {
      // Add repository if not already selected
      if (!selectedRepos.find(r => r.id === repo.id)) {
        newSelectedRepos = [...selectedRepos, repo];
      } else {
        newSelectedRepos = selectedRepos;
      }
    } else {
      // Remove repository
      newSelectedRepos = selectedRepos.filter(r => r.id !== repo.id);
    }
    
    onRepoSelectionChange(newSelectedRepos);
  }, [selectedRepos, onRepoSelectionChange]);

  // Handle removing a selected repository
  const handleRemoveRepo = useCallback((repoId: number) => {
    const newSelectedRepos = selectedRepos.filter(r => r.id !== repoId);
    onRepoSelectionChange(newSelectedRepos);
  }, [selectedRepos, onRepoSelectionChange]);

  // Check if a repository is selected
  const isRepoSelected = useCallback((repoId: number) => {
    return selectedRepos.some(r => r.id === repoId);
  }, [selectedRepos]);

  // Get repositories to display (user repos when no search, search results when searching)
  const displayRepos = state.searchQuery.trim() ? state.searchResults : userRepos;
  const isShowingUserRepos = !state.searchQuery.trim();

  return (
    <div className={className}>
      {/* GitHub PAT Status */}
      {!githubPAT && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            GitHub Personal Access Token required for repository search. 
            Please configure your PAT in settings.
          </p>
        </div>
      )}

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search repositories or browse your own..."
          value={state.searchQuery}
          onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
          className="pl-10"
          disabled={!githubPAT}
        />
        {(state.isLoading || loadingUserRepos) && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full" />
          </div>
        )}
        {state.searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => setState(prev => ({ ...prev, searchQuery: "" }))}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{state.error}</p>
        </div>
      )}

      {/* Selected Repositories */}
      {selectedRepos.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Selected Repositories ({selectedRepos.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedRepos.map((repo) => (
              <Badge
                key={repo.id}
                variant="secondary"
                className="flex items-center gap-2 pr-1 py-1"
              >
                <GitBranch className="h-3 w-3" />
                <span className="text-xs font-medium">{repo.full_name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                  onClick={() => handleRemoveRepo(repo.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
          <Separator className="mt-3" />
        </div>
      )}

      {/* Repository List */}
      {displayRepos.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            {isShowingUserRepos ? `Your Repositories (${displayRepos.length})` : `Search Results (${displayRepos.length})`}
          </h4>
          <ScrollArea className="h-80 border rounded-lg bg-muted/20">
            <div className="p-2 space-y-1">
              {displayRepos.map((repo) => (
                <div
                  key={repo.id}
                  className="flex items-start gap-3 p-3 hover:bg-background rounded-lg transition-all duration-200 border border-transparent hover:border-border hover:shadow-sm"
                >
                  <Checkbox
                    checked={isRepoSelected(repo.id)}
                    onCheckedChange={(checked: boolean) => handleRepoToggle(repo, checked)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <GitBranch className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium text-sm truncate">
                        {repo.full_name}
                      </span>
                      <div className="flex items-center gap-1">
                        {repo.private ? (
                          <Lock className="h-3 w-3 text-amber-500" />
                        ) : (
                          <Globe className="h-3 w-3 text-green-500" />
                        )}
                      </div>
                    </div>
                    {repo.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {repo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <img
                          src={repo.owner.avatar_url}
                          alt={repo.owner.login}
                          className="h-4 w-4 rounded-full"
                        />
                        <span>{repo.owner.login}</span>
                      </div>
                      {(repo as any).stargazers_count > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          <span>{(repo as any).stargazers_count}</span>
                        </div>
                      )}
                      {(repo as any).forks_count > 0 && (
                        <div className="flex items-center gap-1">
                          <GitFork className="h-3 w-3" />
                          <span>{(repo as any).forks_count}</span>
                        </div>
                      )}
                      {(repo as any).language && (
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          <span>{(repo as any).language}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Empty States */}
      {isShowingUserRepos && userRepos.length === 0 && !loadingUserRepos && githubPAT && (
        <div className="text-center py-12 text-muted-foreground">
          <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm font-medium mb-1">No repositories found</p>
          <p className="text-xs">Try searching for repositories or check your GitHub access.</p>
        </div>
      )}

      {state.searchQuery && !state.isLoading && state.searchResults.length === 0 && !state.error && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm font-medium mb-1">No repositories found</p>
          <p className="text-xs">Try different search terms or browse your own repositories.</p>
        </div>
      )}

      {loadingUserRepos && isShowingUserRepos && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="animate-spin h-8 w-8 border-2 border-muted-foreground border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm">Loading your repositories...</p>
        </div>
      )}
    </div>
  );
}