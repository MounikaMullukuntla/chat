"use client";

import { useState } from "react";
import { X, GitBranch, Check, FileCode, Folder as FolderIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitHubContextIntegration } from "./github-context-integration";
import { GitHubFileBrowser } from "./github-file-browser";
import type { GitHubRepo, GitHubFile, GitHubFolder } from "@/lib/types";

interface GitHubRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  githubPAT: string;
  selectedRepos: GitHubRepo[];
  selectedFiles: GitHubFile[];
  selectedFolders: GitHubFolder[];
  onRepoSelectionChange: (repos: GitHubRepo[]) => void;
  onFileSelectionChange: (files: GitHubFile[]) => void;
  onFolderSelectionChange: (folders: GitHubFolder[]) => void;
}

export function GitHubRepoModal({
  isOpen,
  onClose,
  githubPAT,
  selectedRepos,
  selectedFiles,
  selectedFolders,
  onRepoSelectionChange,
  onFileSelectionChange,
  onFolderSelectionChange,
}: GitHubRepoModalProps) {
  const [tempSelectedRepos, setTempSelectedRepos] = useState<GitHubRepo[]>(selectedRepos);
  const [tempSelectedFiles, setTempSelectedFiles] = useState<GitHubFile[]>(selectedFiles);
  const [tempSelectedFolders, setTempSelectedFolders] = useState<GitHubFolder[]>(selectedFolders);
  const [activeTab, setActiveTab] = useState<string>("repos");

  if (!isOpen) return null;

  const handleApply = () => {
    onRepoSelectionChange(tempSelectedRepos);
    onFileSelectionChange(tempSelectedFiles);
    onFolderSelectionChange(tempSelectedFolders);
    onClose();
  };

  const handleCancel = () => {
    // Reset to original selections
    setTempSelectedRepos(selectedRepos);
    setTempSelectedFiles(selectedFiles);
    setTempSelectedFolders(selectedFolders);
    onClose();
  };

  const hasChanges =
    JSON.stringify(tempSelectedRepos.map(r => r.id).sort()) !== JSON.stringify(selectedRepos.map(r => r.id).sort()) ||
    JSON.stringify(tempSelectedFiles.map(f => f.path).sort()) !== JSON.stringify(selectedFiles.map(f => f.path).sort()) ||
    JSON.stringify(tempSelectedFolders.map(f => f.path).sort()) !== JSON.stringify(selectedFolders.map(f => f.path).sort());

  // Determine which repo to show in file browser
  const selectedRepo = tempSelectedRepos.length > 0 ? tempSelectedRepos[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-background border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GitBranch className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">GitHub Context Selection</h2>
              <p className="text-sm text-muted-foreground">Choose repositories, files, and folders for conversation context.</p>
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

        {/* Content with Tabs */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="repos" className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Repositories
                  {tempSelectedRepos.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                      {tempSelectedRepos.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="files" className="flex items-center gap-2" disabled={!selectedRepo}>
                  <FileCode className="h-4 w-4" />
                  Files & Folders
                  {(tempSelectedFiles.length > 0 || tempSelectedFolders.length > 0) && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                      {tempSelectedFiles.length + tempSelectedFolders.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="repos" className="p-6 pt-4">
              <GitHubContextIntegration
                githubPAT={githubPAT}
                selectedRepos={tempSelectedRepos}
                onRepoSelectionChange={setTempSelectedRepos}
                className=""
              />
            </TabsContent>

            <TabsContent value="files" className="p-6 pt-4">
              {selectedRepo ? (
                <div>
                  <div className="mb-4 p-3 bg-muted/50 border border-border rounded-lg">
                    <p className="text-sm font-medium">
                      Browsing: <span className="text-primary">{selectedRepo.full_name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select files and folders to include in your conversation context
                    </p>
                  </div>
                  <GitHubFileBrowser
                    repo={selectedRepo}
                    githubPAT={githubPAT}
                    selectedFiles={tempSelectedFiles}
                    selectedFolders={tempSelectedFolders}
                    onFileSelectionChange={setTempSelectedFiles}
                    onFolderSelectionChange={setTempSelectedFolders}
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm font-medium mb-1">No repository selected</p>
                  <p className="text-xs">Please select a repository from the Repositories tab first</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-muted/30">
          <div className="text-sm text-muted-foreground">
            {tempSelectedRepos.length > 0 && (
              <span className="mr-3">
                {tempSelectedRepos.length} repo{tempSelectedRepos.length !== 1 ? 's' : ''}
              </span>
            )}
            {tempSelectedFiles.length > 0 && (
              <span className="mr-3">
                {tempSelectedFiles.length} file{tempSelectedFiles.length !== 1 ? 's' : ''}
              </span>
            )}
            {tempSelectedFolders.length > 0 && (
              <span>
                {tempSelectedFolders.length} folder{tempSelectedFolders.length !== 1 ? 's' : ''}
              </span>
            )}
            {tempSelectedRepos.length === 0 && tempSelectedFiles.length === 0 && tempSelectedFolders.length === 0 && (
              <span>No items selected</span>
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