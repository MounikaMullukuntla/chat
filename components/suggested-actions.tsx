"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { memo } from "react";
import type { ChatMessage } from "@/lib/types";
import { Suggestion } from "./elements/suggestion";
import type { VisibilityType } from "./visibility-selector";
import type { AdminConfigSummary } from "@/lib/types";
import { useLocalStorage } from "usehooks-ts";
import { useModelCapabilities } from "@/hooks/use-model-capabilities";

type SuggestedActionsProps = {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  selectedVisibilityType: VisibilityType;
  selectedModelId?: string;
  selectedProvider?: string;
};

function PureSuggestedActions({
  chatId,
  sendMessage,
  selectedModelId,
  selectedProvider,
}: SuggestedActionsProps) {
  // Get thinking mode from localStorage (same as multimodal-input)
  const [thinkingMode] = useLocalStorage("thinking-mode", false);

  // Fetch adminConfig directly in this component
  const { modelCapabilities: adminConfig } = useModelCapabilities();

  const suggestedActions = [
    "What are the advantages of using Next.js?",
    "Write code to demonstrate Dijkstra's algorithm",
    "Help me write an essay about Silicon Valley",
    "What is the weather in San Francisco?",
  ];

  return (
    <div
      className="grid w-full gap-2 sm:grid-cols-2"
      data-testid="suggested-actions"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          initial={{ opacity: 0, y: 20 }}
          key={suggestedAction}
          transition={{ delay: 0.05 * index }}
        >
          <Suggestion
            className="h-auto w-full whitespace-normal p-3 text-left"
            onClick={(suggestion) => {
              window.history.replaceState({}, "", `/chat/${chatId}`);

              // Check if thinking mode is supported and enabled (same logic as multimodal-input)
              const providerConfig = selectedProvider && adminConfig?.providers?.[selectedProvider];
              const modelConfig = selectedModelId && providerConfig?.models?.[selectedModelId];
              const supportsThinkingMode = modelConfig?.supportsThinkingMode || false;
              const shouldIncludeThinkingMode = supportsThinkingMode && thinkingMode;

              const messageData: any = {
                role: "user",
                parts: [{ type: "text", text: suggestion }],
              };

              // Add thinking mode metadata if enabled
              if (shouldIncludeThinkingMode) {
                messageData.experimental_providerMetadata = {
                  thinking: true,
                };
              }

              sendMessage(messageData);
            }}
            suggestion={suggestedAction}
          >
            {suggestedAction}
          </Suggestion>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }
    if (prevProps.selectedModelId !== nextProps.selectedModelId) {
      return false;
    }
    if (prevProps.selectedProvider !== nextProps.selectedProvider) {
      return false;
    }

    return true;
  }
);
