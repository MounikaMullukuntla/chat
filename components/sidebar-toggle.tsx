import type { ComponentProps } from "react";

import { type SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SidebarLeftIcon } from "./icons";
import { Button } from "./ui/button";

export function SidebarToggle({
  className,
}: ComponentProps<typeof SidebarTrigger>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className={cn(
            "h-8 px-2 md:h-fit md:px-2 border border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
            className
          )}
          data-testid="sidebar-toggle-button"
          onClick={toggleSidebar}
          variant="ghost"
        >
          <SidebarLeftIcon size={16} />
        </Button>
      </TooltipTrigger>
      <TooltipContent align="start" className="hidden md:block" side="bottom">
        Toggle Sidebar
      </TooltipContent>
    </Tooltip>
  );
}
