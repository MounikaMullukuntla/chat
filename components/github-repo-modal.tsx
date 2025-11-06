"use client";

import { useState } from "react";
import { X, GitBranch, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GitHubContextIntegration } from "./github-context-integration";
import type { GitHubRepo } from "@/lib/types";

interface GitHubRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  githubPAT: string;
  selectedRepos: GitHubRepo[];
  onRepoSelectionChange: (repos: GitHubRepo[]) => void;
}

export function GitHubRepoModal({
  isOpen,
  onClose,
  githubPAT,
  selectedRepos,
  onRepoSelectionChange,
}: GitHubRepoModalProps) {
  const [tempSelectedRepos, setTempSelectedRepos] = useState<GitHubRepo[]>(selectedRepos);

  if (!isOpen) return null;

  const handleApply = () => {
    onRepoSelectionChange(tempSelectedRepos);
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedRepos(selectedRepos); // Reset to original selection
    onClose();
  };

  const hasChanges = JSON.stringify(tempSelectedRepos.map(r => r.id).sort()) !== 
                    JSON.stringify(selectedRepos.map(r => r.id).sort());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-background border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GitBranch className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Select GitHub Repositories</h2>
              <p className="text-sm text-muted-foreground">Choose repositories to include in your conversation context.</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="h-8 w-8 p-0 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          <GitHubContextIntegration
            githubPAT={githubPAT}
            selectedRepos={tempSelectedRepos}
            onRepoSelectionChange={setTempSelectedRepos}
            className=""
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-muted/30">
          <div className="text-sm text-muted-foreground">
            {tempSelectedRepos.length > 0 ? (
              <span>{tempSelectedRepos.length} repository{tempSelectedRepos.length !== 1 ? 'ies' : 'y'} selected</span>
            ) : (
              <span>No repositories selected</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="px-4"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              className="px-6 flex items-center gap-2"
              disabled={!hasChanges && tempSelectedRepos.length === 0}
            >
              <Check className="h-4 w-4" />
              Apply Selection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}