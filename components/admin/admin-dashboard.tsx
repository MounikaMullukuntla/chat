"use client";

import { ArrowLeft, Brain, MessageSquare, Settings, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Provider = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

// Preconfigured providers
const AVAILABLE_PROVIDERS: Provider[] = [
  {
    id: "google",
    name: "Google AI",
    description: "Gemini models for advanced AI capabilities",
    icon: Brain,
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT models for conversational AI",
    icon: Zap,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude models for reasoning and analysis",
    icon: MessageSquare,
  },
];

export function AdminDashboard() {
  const router = useRouter();
  const [providerStats, setProviderStats] = useState<
    Record<string, { activeAgents: number; totalAgents: number }>
  >({});
  const [loading, setLoading] = useState(true);

  // Fetch provider statistics
  useEffect(() => {
    const fetchProviderStats = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/admin/config/summary");
        if (response.ok) {
          const data = await response.json();
          // Extract stats from the consolidated response
          setProviderStats(data.stats);
        }
      } catch (error) {
        console.error("Failed to fetch provider stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProviderStats();
  }, []);

  const handleConfigureProvider = (providerId: string) => {
    router.push(`/admin/${providerId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <Button
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              onClick={() => router.push("/chat")}
              variant="ghost"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Chat
            </Button>
          </div>
          <div className="mb-2 flex items-center gap-3">
            <Settings className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="font-bold text-3xl text-gray-900 dark:text-white">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Select an AI provider to configure agent settings.
              </p>
            </div>
          </div>
        </div>

        {/* Provider Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select AI Provider</CardTitle>
            <CardDescription>
              Choose a provider to configure all 6 AI agents (Chat Model,
              Provider Tools, Document, Python, Mermaid, Git MCP)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              {AVAILABLE_PROVIDERS.map((provider) => {
                const Icon = provider.icon;
                return (
                  <Card
                    className="cursor-pointer transition-shadow hover:shadow-md"
                    key={provider.id}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Icon className="h-8 w-8 text-blue-600" />
                          <div>
                            <div className="mb-1 flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900 text-lg dark:text-white">
                                {provider.name}
                              </h3>
                              {!loading && providerStats[provider.id] && (
                                <Badge className="text-xs" variant="outline">
                                  {providerStats[provider.id].activeAgents}/
                                  {providerStats[provider.id].totalAgents}{" "}
                                  active
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400">
                              {provider.description}
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleConfigureProvider(provider.id)}
                        >
                          Configure
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
