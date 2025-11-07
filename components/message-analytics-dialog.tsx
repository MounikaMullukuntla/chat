"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart3Icon, DollarSignIcon, BrainIcon, ArrowRightIcon } from "lucide-react";

// Dummy analytics data structure
interface AgentAnalytics {
  name: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cost: number;
  executionTime: number;
}

interface ToolAnalytics {
  name: string;
  input: string;
  output: string;
  executionTime: number;
  cost: number;
}

interface MessageAnalytics {
  mainAgent: AgentAnalytics;
  subAgents: AgentAnalytics[];
  tools: ToolAnalytics[];
  agentInteractions: {
    from: string;
    to: string;
    input: string;
    output: string;
    timestamp: string;
  }[];
  totalCost: number;
  totalExecutionTime: number;
}

// Generate dummy data for demonstration
const generateDummyAnalytics = (): MessageAnalytics => {
  return {
    mainAgent: {
      name: "Google Chat Agent",
      inputTokens: 1247,
      outputTokens: 892,
      reasoningTokens: 456,
      cost: 0.0034,
      executionTime: 2.3
    },
    subAgents: [
      {
        name: "Provider Tools Agent",
        inputTokens: 234,
        outputTokens: 567,
        reasoningTokens: 123,
        cost: 0.0012,
        executionTime: 1.8
      },
      {
        name: "Web Search Agent",
        inputTokens: 89,
        outputTokens: 234,
        reasoningTokens: 67,
        cost: 0.0008,
        executionTime: 0.9
      }
    ],
    tools: [
      {
        name: "providerToolsAgent",
        input: "Tell me content of https://ananth-portfolio-website.vercel.app/",
        output: "The website 'Ananth's Portfolio' belongs to Ananth Pai, a software developer specializing in Artificial Intelligence...",
        executionTime: 1.2,
        cost: 0.0005
      },
      {
        name: "urlContext",
        input: "https://ananth-portfolio-website.vercel.app/",
        output: "Portfolio website content extracted successfully",
        executionTime: 0.8,
        cost: 0.0003
      }
    ],
    agentInteractions: [
      {
        from: "Google Chat Agent",
        to: "Provider Tools Agent",
        input: "Analyze this URL: https://ananth-portfolio-website.vercel.app/",
        output: "URL analysis complete. Found portfolio website with developer information.",
        timestamp: "2024-11-06T10:30:15Z"
      },
      {
        from: "Provider Tools Agent",
        to: "Web Search Agent",
        input: "Search for additional context about Ananth Pai",
        output: "Found LinkedIn profile and GitHub repositories",
        timestamp: "2024-11-06T10:30:18Z"
      }
    ],
    totalCost: 0.0062,
    totalExecutionTime: 5.0
  };
};

interface MessageAnalyticsDialogProps {
  children: React.ReactNode;
  messageId: string;
}

export function MessageAnalyticsDialog({ children, messageId }: MessageAnalyticsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const analytics = generateDummyAnalytics();

  const formatCost = (cost: number) => `$${cost.toFixed(4)}`;
  const formatTime = (time: number) => `${time.toFixed(1)}s`;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-[800px] sm:max-w-[800px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BarChart3Icon className="size-5" />
            Message Analytics
            <Badge variant="secondary" className="ml-2">
              {messageId.slice(0, 8)}...
            </Badge>
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSignIcon className="size-4 text-green-600" />
                  <span className="font-medium">Total Cost</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCost(analytics.totalCost)}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BrainIcon className="size-4 text-blue-600" />
                  <span className="font-medium">Total Time</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatTime(analytics.totalExecutionTime)}
                </div>
              </div>
            </div>

            <Separator />

            {/* Main Agent */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Main Agent</h3>
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">{analytics.mainAgent.name}</span>
                  <Badge variant="default">Primary</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Input Tokens</div>
                    <div className="font-medium">{analytics.mainAgent.inputTokens.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Output Tokens</div>
                    <div className="font-medium">{analytics.mainAgent.outputTokens.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Reasoning Tokens</div>
                    <div className="font-medium">{analytics.mainAgent.reasoningTokens.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Cost</div>
                    <div className="font-medium text-green-600">{formatCost(analytics.mainAgent.cost)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Time</div>
                    <div className="font-medium text-blue-600">{formatTime(analytics.mainAgent.executionTime)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub Agents */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Sub Agents</h3>
              <div className="space-y-3">
                {analytics.subAgents.map((agent, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium">{agent.name}</span>
                      <Badge variant="secondary">Sub Agent</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Input Tokens</div>
                        <div className="font-medium">{agent.inputTokens.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Output Tokens</div>
                        <div className="font-medium">{agent.outputTokens.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Reasoning Tokens</div>
                        <div className="font-medium">{agent.reasoningTokens.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Cost</div>
                        <div className="font-medium text-green-600">{formatCost(agent.cost)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Time</div>
                        <div className="font-medium text-blue-600">{formatTime(agent.executionTime)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tools */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Tools Used</h3>
              <div className="space-y-3">
                {analytics.tools.map((tool, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium">{tool.name}</span>
                      <div className="flex gap-2">
                        <Badge variant="outline">{formatCost(tool.cost)}</Badge>
                        <Badge variant="outline">{formatTime(tool.executionTime)}</Badge>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <div className="text-muted-foreground mb-1">Input:</div>
                        <div className="bg-muted p-2 rounded text-xs font-mono">
                          {tool.input.length > 100 ? `${tool.input.slice(0, 100)}...` : tool.input}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Output:</div>
                        <div className="bg-muted p-2 rounded text-xs font-mono">
                          {tool.output.length > 100 ? `${tool.output.slice(0, 100)}...` : tool.output}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent Interactions */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Agent Interactions</h3>
              <div className="space-y-3">
                {analytics.agentInteractions.map((interaction, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline">{interaction.from}</Badge>
                      <ArrowRightIcon className="size-4 text-muted-foreground" />
                      <Badge variant="outline">{interaction.to}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(interaction.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <div className="text-muted-foreground mb-1">Input:</div>
                        <div className="bg-muted p-2 rounded text-xs">
                          {interaction.input}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Output:</div>
                        <div className="bg-muted p-2 rounded text-xs">
                          {interaction.output}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}