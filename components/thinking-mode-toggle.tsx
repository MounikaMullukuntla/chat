"use client";

import { memo } from "react";
import { Switch } from "@/components/ui/switch";
import type { AdminConfigSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

type ThinkingModeToggleProps = {
  selectedModel: string;
  adminConfig?: AdminConfigSummary;
  thinkingMode: boolean;
  onThinkingModeChange: (enabled: boolean) => void;
  className?: string;
};

function PureThinkingModeToggle({
  selectedModel,
  adminConfig,
  thinkingMode,
  onThinkingModeChange,
  className,
}: ThinkingModeToggleProps) {
  // Check if the selected model supports thinking mode
  const supportsThinkingMode = (() => {
    if (!adminConfig || !selectedModel) {
      return false;
    }

    // Find the provider and model that matches the selectedModel
    for (const [providerKey, provider] of Object.entries(
      adminConfig.providers
    )) {
      if (!provider.enabled) {
        continue;
      }

      for (const [modelKey, model] of Object.entries(provider.models)) {
        // Try multiple matching patterns
        const matches = [
          modelKey === selectedModel,
          `${providerKey}-${modelKey}` === selectedModel,
          selectedModel.replace(`${providerKey}-`, "") === modelKey,
          selectedModel.endsWith(modelKey) &&
            selectedModel.startsWith(providerKey),
        ];

        if (matches.some((match) => match)) {
          return model.enabled && model.supportsThinkingMode;
        }
      }
    }

    return false;
  })();

  // Don't render if thinking mode is not supported
  if (!supportsThinkingMode) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Switch
        aria-label="Toggle thinking mode"
        checked={thinkingMode}
        className="h-5 w-9 data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted"
        onCheckedChange={onThinkingModeChange}
      />
      <span className="text-muted-foreground text-xs">Thinking</span>
    </div>
  );
}

export const ThinkingModeToggle = memo(PureThinkingModeToggle);
