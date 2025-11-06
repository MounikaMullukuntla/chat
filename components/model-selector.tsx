"use client";

import { memo, startTransition } from "react";
import { saveChatModelAsCookie } from "@/app/(chat)/actions";
import type { AdminConfigSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CpuIcon, ChevronDownIcon, CheckCircleFillIcon } from "./icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ModelSelectorProps {
  selectedModel: string;
  adminConfig?: AdminConfigSummary | null;
  isLoading?: boolean;
  error?: string | null;
  onModelChange: (model: string) => void;
  className?: string;
}

function PureModelSelector({
  selectedModel,
  adminConfig,
  isLoading = false,
  error,
  onModelChange,
  className,
}: ModelSelectorProps) {
  // Handle loading and error states
  if (isLoading) {
    return (
      <div className={cn(
        "flex h-8 items-center gap-2 rounded-lg border-0 bg-background px-2 text-foreground shadow-none",
        className
      )}>
        <CpuIcon size={16} />
        <span className="hidden font-medium text-xs sm:block text-muted-foreground">
          Loading...
        </span>
      </div>
    );
  }

  if (error || !adminConfig) {
    return (
      <div className={cn(
        "flex h-8 items-center gap-2 rounded-lg border-0 bg-background px-2 text-foreground shadow-none",
        className
      )}>
        <CpuIcon size={16} />
        <span className="hidden font-medium text-xs sm:block text-muted-foreground">
          Config Error
        </span>
      </div>
    );
  }

  // Group models by provider and ensure only one default per provider
  const providerGroups: Array<{
    providerId: string;
    providerName: string;
    enabled: boolean;
    models: Array<{
      id: string;
      name: string;
      description: string;
      provider: string;
      providerName: string;
      isDefault: boolean;
    }>;
  }> = [];

  Object.entries(adminConfig.providers || {}).forEach(([providerId, providerConfig]) => {
    if (!providerConfig.enabled) return;
    
    const providerName = providerId.charAt(0).toUpperCase() + providerId.slice(1);
    const models: any[] = [];
    
    // First pass: collect all enabled models
    Object.entries(providerConfig.models || {}).forEach(([modelId, modelConfig]) => {
      if (modelConfig.enabled) {
        models.push({
          id: modelId,
          name: modelConfig.name,
          description: modelConfig.description,
          provider: providerId,
          providerName,
          isDefault: modelConfig.isDefault,
        });
      }
    });

    // Second pass: ensure only one default per provider
    const defaultModels = models.filter(m => m.isDefault);
    if (defaultModels.length > 1) {
      // If multiple defaults, keep only the first one
      models.forEach((model, index) => {
        if (model.isDefault && index > 0) {
          model.isDefault = false;
        }
      });
    } else if (defaultModels.length === 0 && models.length > 0) {
      // If no default, make the first model default
      models[0].isDefault = true;
    }

    // Sort models: default first, then by name
    models.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });

    if (models.length > 0) {
      providerGroups.push({
        providerId,
        providerName,
        enabled: providerConfig.enabled,
        models,
      });
    }
  });

  // Sort provider groups by name
  providerGroups.sort((a, b) => a.providerName.localeCompare(b.providerName));

  // Find current selected model
  let currentModel: any = null;
  let currentProvider = "";
  
  for (const group of providerGroups) {
    const model = group.models.find(m => m.id === selectedModel);
    if (model) {
      currentModel = model;
      currentProvider = group.providerName;
      break;
    }
  }
  
  // If no exact match, try partial matching
  if (!currentModel) {
    for (const group of providerGroups) {
      const model = group.models.find(m => 
        m.id.includes(selectedModel) || selectedModel.includes(m.id)
      );
      if (model) {
        currentModel = model;
        currentProvider = group.providerName;
        break;
      }
    }
  }
  
  // If still no match, use the first default model or first model
  if (!currentModel && providerGroups.length > 0) {
    for (const group of providerGroups) {
      const defaultModel = group.models.find(m => m.isDefault);
      if (defaultModel) {
        currentModel = defaultModel;
        currentProvider = group.providerName;
        break;
      }
    }
    
    // If no default found, use first model
    if (!currentModel) {
      currentModel = providerGroups[0].models[0];
      currentProvider = providerGroups[0].providerName;
    }
  }

  const handleModelSelection = (modelId: string) => {
    onModelChange(modelId);
    startTransition(() => {
      saveChatModelAsCookie(modelId);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex h-8 items-center gap-2 rounded-lg border-0 bg-background px-2 text-foreground shadow-none transition-colors hover:bg-accent focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-auto min-w-[200px]",
            className
          )}
        >
          <CpuIcon size={16} />
          <div className="flex items-center gap-2">
            <span className="hidden font-medium text-xs sm:block">
              {currentModel?.name || "Select Model"}
            </span>
            {currentModel && (
              <span className="hidden text-[10px] text-muted-foreground sm:block">
                ({currentProvider})
              </span>
            )}
          </div>
          <ChevronDownIcon size={16} />
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="min-w-[320px] max-h-[400px] overflow-y-auto">
        {providerGroups.map((group) => (
          <DropdownMenuSub key={group.providerId}>
            <DropdownMenuSubTrigger className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{group.providerName}</span>
                <span className="text-xs text-muted-foreground/70">
                  {group.models.length} model{group.models.length !== 1 ? 's' : ''}
                </span>
              </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="min-w-[280px]">
                {group.models.map((model) => (
                  <DropdownMenuItem 
                    key={model.id}
                    onClick={() => handleModelSelection(model.id)}
                    className="cursor-pointer focus:bg-accent focus:text-accent-foreground px-3 py-3 h-auto"
                  >
                    <div className="flex items-start justify-between w-full gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="truncate font-medium text-sm">{model.name}</span>
                          {model.isDefault && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground leading-relaxed">
                          {model.description}
                        </div>
                      </div>
                      {selectedModel === model.id && (
                        <div className="text-primary flex-shrink-0 mt-0.5">
                          <CheckCircleFillIcon size={14} />
                        </div>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        ))}
        
        {providerGroups.length === 0 && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No models available
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const ModelSelector = memo(PureModelSelector);