"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Search,
  X,
  FileText,
  FileCode,
  FileJson,
  Image as ImageIcon,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { GitHubRepo, GitHubFile, GitHubFolder } from "@/lib/types";

interface GitHubFileBrowserProps {
  repo: GitHubRepo;
  githubPAT: string;
  selectedFiles: GitHubFile[];
  selectedFolders: GitHubFolder[];
  onFileSelectionChange: (files: GitHubFile[]) => void;
  onFolderSelectionChange: (folders: GitHubFolder[]) => void;
  className?: string;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  sha?: string;
  isExpanded?: boolean;
  isLoading?: boolean;
  children?: TreeNode[];
}

export function GitHubFileBrowser({
  repo,
  githubPAT,
  selectedFiles,
  selectedFolders,
  onFileSelectionChange,
  onFolderSelectionChange,
  className,
}: GitHubFileBrowserProps) {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [isLoadingRoot, setIsLoadingRoot] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Load root directory on mount
  useEffect(() => {
    if (repo && githubPAT) {
      loadDirectory('');
    }
  }, [repo, githubPAT]);

  /**
   * Load directory contents from GitHub API
   */
  const loadDirectory = useCallback(async (path: string) => {
    if (!githubPAT) {
      toast.error('GitHub PAT is required');
      return;
    }

    const isRoot = path === '';
    if (isRoot) {
      setIsLoadingRoot(true);
    }

    try {
      const encodedPath = path ? encodeURIComponent(path) : '';
      const url = `https://api.github.com/repos/${repo.full_name}/contents/${encodedPath}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${githubPAT}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Directory not found');
        } else if (response.status === 403) {
          throw new Error('API rate limit exceeded or insufficient permissions');
        } else {
          throw new Error(`GitHub API error: ${response.status}`);
        }
      }

      const data = await response.json();

      // Handle if response is a file instead of directory
      if (!Array.isArray(data)) {
        throw new Error('Selected path is a file, not a directory');
      }

      const nodes: TreeNode[] = data.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type === 'dir' ? 'dir' : 'file',
        size: item.size,
        sha: item.sha,
        isExpanded: false,
        isLoading: false,
        children: item.type === 'dir' ? [] : undefined,
      }));

      // Sort: directories first, then files
      nodes.sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type === 'dir' ? -1 : 1;
      });

      if (isRoot) {
        setTreeData(nodes);
        setError(null);
      } else {
        // Update the specific directory in the tree
        setTreeData(prevTree => updateTreeNode(prevTree, path, nodes));
      }
    } catch (error) {
      console.error('Failed to load directory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load directory';

      if (isRoot) {
        setError(errorMessage);
      }
      toast.error(errorMessage);
    } finally {
      if (isRoot) {
        setIsLoadingRoot(false);
      }
    }
  }, [repo, githubPAT]);

  /**
   * Recursively update a tree node with new children
   */
  const updateTreeNode = (
    tree: TreeNode[],
    targetPath: string,
    newChildren: TreeNode[]
  ): TreeNode[] => {
    return tree.map(node => {
      if (node.path === targetPath) {
        return {
          ...node,
          children: newChildren,
          isExpanded: true,
          isLoading: false,
        };
      }
      if (node.children && targetPath.startsWith(node.path + '/')) {
        return {
          ...node,
          children: updateTreeNode(node.children, targetPath, newChildren),
        };
      }
      return node;
    });
  };

  /**
   * Toggle directory expansion (lazy load)
   */
  const toggleDirectory = useCallback(async (path: string) => {
    setTreeData(prevTree => {
      const updatedTree = toggleNodeExpansion(prevTree, path);

      // Find the node to check if we need to load children
      const node = findNode(updatedTree, path);
      if (node && node.isExpanded && (!node.children || node.children.length === 0)) {
        // Load children lazily
        loadDirectory(path);
      }

      return updatedTree;
    });
  }, [loadDirectory]);

  /**
   * Recursively toggle node expansion state
   */
  const toggleNodeExpansion = (tree: TreeNode[], targetPath: string): TreeNode[] => {
    return tree.map(node => {
      if (node.path === targetPath) {
        return {
          ...node,
          isExpanded: !node.isExpanded,
          isLoading: node.children && node.children.length === 0 ? true : false,
        };
      }
      if (node.children && targetPath.startsWith(node.path + '/')) {
        return {
          ...node,
          children: toggleNodeExpansion(node.children, targetPath),
        };
      }
      return node;
    });
  };

  /**
   * Find a node in the tree by path
   */
  const findNode = (tree: TreeNode[], targetPath: string): TreeNode | null => {
    for (const node of tree) {
      if (node.path === targetPath) {
        return node;
      }
      if (node.children && targetPath.startsWith(node.path + '/')) {
        const found = findNode(node.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  };

  /**
   * Handle file selection
   */
  const handleFileToggle = useCallback((file: TreeNode, isSelected: boolean) => {
    const githubFile: GitHubFile = {
      path: file.path,
      name: file.name,
      type: 'file',
      size: file.size,
      sha: file.sha,
    };

    if (isSelected) {
      if (!selectedFiles.find(f => f.path === file.path)) {
        onFileSelectionChange([...selectedFiles, githubFile]);
      }
    } else {
      onFileSelectionChange(selectedFiles.filter(f => f.path !== file.path));
    }
  }, [selectedFiles, onFileSelectionChange]);

  /**
   * Handle folder selection
   */
  const handleFolderToggle = useCallback((folder: TreeNode, isSelected: boolean) => {
    const githubFolder: GitHubFolder = {
      path: folder.path,
      name: folder.name,
      type: 'dir',
    };

    if (isSelected) {
      if (!selectedFolders.find(f => f.path === folder.path)) {
        onFolderSelectionChange([...selectedFolders, githubFolder]);
      }
    } else {
      onFolderSelectionChange(selectedFolders.filter(f => f.path !== folder.path));
    }
  }, [selectedFolders, onFolderSelectionChange]);

  /**
   * Check if file is selected
   */
  const isFileSelected = useCallback((path: string) => {
    return selectedFiles.some(f => f.path === path);
  }, [selectedFiles]);

  /**
   * Check if folder is selected
   */
  const isFolderSelected = useCallback((path: string) => {
    return selectedFolders.some(f => f.path === path);
  }, [selectedFolders]);

  /**
   * Get file icon based on extension
   */
  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'go':
      case 'rs':
        return <FileCode className="h-4 w-4 text-blue-500" />;
      case 'json':
      case 'yaml':
      case 'yml':
      case 'toml':
        return <FileJson className="h-4 w-4 text-yellow-500" />;
      case 'md':
      case 'txt':
      case 'doc':
      case 'pdf':
        return <FileText className="h-4 w-4 text-gray-500" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <ImageIcon className="h-4 w-4 text-purple-500" />;
      default:
        return <File className="h-4 w-4 text-gray-400" />;
    }
  };

  /**
   * Filter tree data based on search query
   */
  const filterTree = (nodes: TreeNode[], query: string): TreeNode[] => {
    if (!query.trim()) return nodes;

    const lowerQuery = query.toLowerCase();

    return nodes.filter(node => {
      const nameMatches = node.name.toLowerCase().includes(lowerQuery);
      const pathMatches = node.path.toLowerCase().includes(lowerQuery);

      if (node.type === 'dir' && node.children) {
        const filteredChildren = filterTree(node.children, query);
        if (filteredChildren.length > 0) {
          return true;
        }
      }

      return nameMatches || pathMatches;
    }).map(node => {
      if (node.type === 'dir' && node.children) {
        return {
          ...node,
          children: filterTree(node.children, query),
          isExpanded: query.trim() ? true : node.isExpanded, // Auto-expand when searching
        };
      }
      return node;
    });
  };

  /**
   * Render tree node recursively
   */
  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const isFile = node.type === 'file';
    const isExpanded = node.isExpanded;
    const isSelected = isFile ? isFileSelected(node.path) : isFolderSelected(node.path);

    return (
      <div key={node.path}>
        <div
          className="flex items-center gap-2 py-1.5 px-2 hover:bg-muted/50 rounded-md cursor-pointer group"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {/* Expand/collapse button for directories */}
          {!isFile && (
            <button
              type="button"
              onClick={() => toggleDirectory(node.path)}
              className="p-0.5 hover:bg-muted rounded"
            >
              {node.isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              ) : isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          )}

          {/* Checkbox */}
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked: boolean) => {
              if (isFile) {
                handleFileToggle(node, checked);
              } else {
                handleFolderToggle(node, checked);
              }
            }}
            className="mt-0.5"
          />

          {/* Icon */}
          {isFile ? (
            getFileIcon(node.name)
          ) : isExpanded ? (
            <FolderOpen className="h-4 w-4 text-blue-400" />
          ) : (
            <Folder className="h-4 w-4 text-blue-400" />
          )}

          {/* Name */}
          <span className="text-sm flex-1 truncate">{node.name}</span>

          {/* Size for files */}
          {isFile && node.size !== undefined && (
            <span className="text-xs text-muted-foreground">
              {formatBytes(node.size)}
            </span>
          )}
        </div>

        {/* Render children for expanded directories */}
        {!isFile && isExpanded && node.children && node.children.length > 0 && (
          <div>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredTree = filterTree(treeData, searchQuery);

  return (
    <div className={className}>
      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search files and folders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => setSearchQuery("")}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Loading state */}
      {isLoadingRoot && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading repository files...</span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoadingRoot && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Tree view */}
      {!isLoadingRoot && !error && (
        <ScrollArea className="h-96 border rounded-lg bg-muted/20">
          <div className="p-2">
            {filteredTree.length > 0 ? (
              filteredTree.map(node => renderTreeNode(node))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm font-medium mb-1">No files found</p>
                <p className="text-xs">Try a different search term</p>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Selection summary */}
      {(selectedFiles.length > 0 || selectedFolders.length > 0) && (
        <div className="mt-3 text-xs text-muted-foreground">
          Selected: {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
          {selectedFolders.length > 0 && `, ${selectedFolders.length} folder${selectedFolders.length !== 1 ? 's' : ''}`}
        </div>
      )}
    </div>
  );
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round(bytes / Math.pow(k, i) * 10) / 10} ${sizes[i]}`;
}
