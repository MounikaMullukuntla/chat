"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Settings, Key, GitBranch, Database, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { APIKeySection } from "./api-key-section";
import { GitHubIntegrationSection } from "./github-integration-section";
import { StorageManagementSection } from "./storage-management-section";
import { SettingsErrorBoundary, useErrorHandler } from "./error-boundary";
import { 
  SettingsLoadingState, 
  SettingsErrorState, 
  NetworkState, 
  ConnectedState,
  ComponentLoading 
} from "./fallback-states";
import { GoogleVerificationService } from "@/lib/verification/google-verification-service";
import { AnthropicVerificationService } from "@/lib/verification/anthropic-verification-service";
import { OpenAIVerificationService } from "@/lib/verification/openai-verification-service";
import { storage } from "@/lib/storage/helpers";
import { useNetworkStatus, useNetworkRetry } from "@/hooks/use-network-status";
import { useToastNotifications } from "@/hooks/use-toast-notifications";
import { ToastNotifications } from "./toast-notifications";
import { SettingsEnhancements } from "./settings-enhancements";
import { cn } from "@/lib/utils";

interface SettingsPageProps {
  className?: string;
}

export function SettingsPage({ className }: SettingsPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("api-keys");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConnectedState, setShowConnectedState] = useState(false);
  
  // API Key states
  const [googleKey, setGoogleKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  
  // Verification services
  const googleService = new GoogleVerificationService();
  const anthropicService = new AnthropicVerificationService();
  const openaiService = new OpenAIVerificationService();

  // Network status and error handling
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const handleError = useErrorHandler();
  const toast = useToastNotifications();

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Handle keyboard shortcuts for tab navigation
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case '1':
          event.preventDefault();
          setActiveTab("api-keys");
          break;
        case '2':
          event.preventDefault();
          setActiveTab("integrations");
          break;
        case '3':
          event.preventDefault();
          setActiveTab("storage");
          break;
      }
    }
  }, []);

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Initialize settings data
  const initializeSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Simulate a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300));

      // Load existing API keys
      const existingGoogleKey = storage.apiKeys.get('google');
      const existingAnthropicKey = storage.apiKeys.get('anthropic');
      const existingOpenaiKey = storage.apiKeys.get('openai');
      
      if (existingGoogleKey) setGoogleKey(existingGoogleKey);
      if (existingAnthropicKey) setAnthropicKey(existingAnthropicKey);
      if (existingOpenaiKey) setOpenaiKey(existingOpenaiKey);

      // Check storage health
      const healthCheck = storage.general.checkHealth();
      if (!healthCheck.healthy) {
        console.warn('Storage health issues detected:', healthCheck.errors);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
      setError(errorMessage);
      handleError(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  // Load existing API keys on mount
  useEffect(() => {
    initializeSettings();
  }, [initializeSettings]);

  // Handle network reconnection
  useNetworkRetry(useCallback(() => {
    if (error) {
      setShowConnectedState(true);
      toast.success('Connection restored', 'Reloading settings...');
      initializeSettings();
      setTimeout(() => setShowConnectedState(false), 3000);
    }
  }, [error, initializeSettings, toast]));

  // API Key handlers with error handling
  const handleGoogleKeyChange = useCallback((value: string) => {
    try {
      setGoogleKey(value);
      if (value.trim()) {
        storage.apiKeys.set('google', value);
        toast.success('Google API key saved', 'Your API key has been stored locally.');
      } else {
        storage.apiKeys.remove('google');
        toast.info('Google API key removed', 'Your API key has been cleared.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save Google API key';
      toast.error('Failed to save API key', errorMessage);
      handleError(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [handleError, toast]);

  const handleAnthropicKeyChange = useCallback((value: string) => {
    try {
      setAnthropicKey(value);
      if (value.trim()) {
        storage.apiKeys.set('anthropic', value);
        toast.success('Anthropic API key saved', 'Your API key has been stored locally.');
      } else {
        storage.apiKeys.remove('anthropic');
        toast.info('Anthropic API key removed', 'Your API key has been cleared.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save Anthropic API key';
      toast.error('Failed to save API key', errorMessage);
      handleError(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [handleError, toast]);

  const handleOpenaiKeyChange = useCallback((value: string) => {
    try {
      setOpenaiKey(value);
      if (value.trim()) {
        storage.apiKeys.set('openai', value);
        toast.success('OpenAI API key saved', 'Your API key has been stored locally.');
      } else {
        storage.apiKeys.remove('openai');
        toast.info('OpenAI API key removed', 'Your API key has been cleared.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save OpenAI API key';
      toast.error('Failed to save API key', errorMessage);
      handleError(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [handleError, toast]);

  // Get storage summary for display
  const storageSummary = storage.general.getSummary();

  // Show loading state
  if (isLoading) {
    return <SettingsLoadingState className={className} />;
  }

  // Show error state
  if (error) {
    return (
      <SettingsErrorState
        className={className}
        error={error}
        onRetry={initializeSettings}
        onReload={() => window.location.reload()}
      />
    );
  }

  return (
    <SettingsErrorBoundary>
      {/* Network Status Indicators */}
      <NetworkState isOnline={isOnline} onRetry={initializeSettings} />
      {showConnectedState && <ConnectedState />}
      
      {/* Slow Connection Warning */}
      {isOnline && isSlowConnection && (
        <div className="fixed top-4 left-4 z-50">
          <Card className="w-80 border-yellow-200 bg-yellow-50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-yellow-800 text-sm">
                <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse"></div>
                Slow connection detected. Some features may be slower.
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Main Content */}
      <div className={cn("container mx-auto px-4 py-4 sm:py-8", className)}>
        <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/chat')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                aria-label="Back to chat"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Chat</span>
              </Button>
              <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Settings
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                Manage your API keys and integrations. All data is stored locally in your browser.
              </p>
            </div>
          </div>
          
          {/* Storage Summary and Enhancements */}
          {storageSummary.totalItems > 0 ? (
            <SettingsEnhancements />
          ) : (
            <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 bg-gray-400 rounded-full flex-shrink-0"></div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        No Configuration
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        Add your API keys and integrations to get started
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-800 dark:text-blue-100 dark:border-blue-600 self-start sm:self-center">
                    Local Storage
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tab Navigation */}
          <Card>
            <CardContent className="p-3 sm:p-6">
              <TabsList 
                className="grid w-full grid-cols-3 gap-1 sm:gap-2 h-auto p-1"
                role="tablist"
                aria-label="Settings navigation"
              >
                <TabsTrigger
                  value="api-keys"
                  className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-4 h-auto data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/20 dark:data-[state=active]:text-blue-300"
                  role="tab"
                  aria-controls="api-keys-panel"
                  aria-selected={activeTab === "api-keys"}
                  title="API Keys (Ctrl+1 or Cmd+1)"
                >
                  <Key className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                  <div className="text-center">
                    <div className="font-medium text-xs sm:text-sm">API Keys</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">
                      Configure AI provider credentials
                    </div>
                    {storageSummary.apiKeys.count > 0 && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {storageSummary.apiKeys.count}
                      </Badge>
                    )}
                  </div>
                </TabsTrigger>
                
                <TabsTrigger
                  value="integrations"
                  className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-4 h-auto data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/20 dark:data-[state=active]:text-blue-300"
                  role="tab"
                  aria-controls="integrations-panel"
                  aria-selected={activeTab === "integrations"}
                  title="Integrations (Ctrl+2 or Cmd+2)"
                >
                  <GitBranch className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                  <div className="text-center">
                    <div className="font-medium text-xs sm:text-sm">Integrations</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">
                      Connect external services
                    </div>
                    {storageSummary.integrations.github && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        GitHub
                      </Badge>
                    )}
                  </div>
                </TabsTrigger>

                <TabsTrigger
                  value="storage"
                  className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-4 h-auto data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/20 dark:data-[state=active]:text-blue-300"
                  role="tab"
                  aria-controls="storage-panel"
                  aria-selected={activeTab === "storage"}
                  title="Storage (Ctrl+3 or Cmd+3)"
                >
                  <Database className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                  <div className="text-center">
                    <div className="font-medium text-xs sm:text-sm">Storage</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">
                      Manage storage settings
                    </div>
                  </div>
                </TabsTrigger>
              </TabsList>
              
              {/* Keyboard shortcuts help - hidden on mobile */}
              <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center hidden sm:block">
                <span className="sr-only">Keyboard shortcuts: </span>
                Use <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+1</kbd>, 
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs ml-1">Ctrl+2</kbd>, 
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs ml-1">Ctrl+3</kbd> to navigate tabs
              </div>
            </CardContent>
          </Card>

          {/* API Keys Tab */}
          <TabsContent 
            value="api-keys" 
            className="space-y-6"
            role="tabpanel"
            id="api-keys-panel"
            aria-labelledby="api-keys-tab"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" aria-hidden="true" />
                  API Keys
                </CardTitle>
                <CardDescription>
                  Configure API keys for AI providers. Keys are stored locally in your browser and never sent to our servers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                {/* Security Notice */}
                <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0">
                      🔒
                    </div>
                    <div className="text-xs sm:text-sm min-w-0">
                      <div className="font-medium text-green-900 dark:text-green-100 mb-1">
                        Secure Local Storage
                      </div>
                      <div className="text-green-700 dark:text-green-300">
                        Your API keys are stored locally in your browser and are never transmitted to our servers. 
                        They remain private and secure on your device.
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Google AI API Key */}
                <Suspense fallback={<ComponentLoading />}>
                  <SettingsErrorBoundary>
                    <APIKeySection
                      provider="google"
                      title="Google AI"
                      description="Configure your Google AI API key to use Gemini models"
                      placeholder="AIza..."
                      value={googleKey}
                      onChange={handleGoogleKeyChange}
                      onVerify={googleService.verify.bind(googleService)}
                    />
                  </SettingsErrorBoundary>
                </Suspense>

                {/* Anthropic API Key */}
                <Suspense fallback={<ComponentLoading />}>
                  <SettingsErrorBoundary>
                    <APIKeySection
                      provider="anthropic"
                      title="Anthropic"
                      description="Configure your Anthropic API key to use Claude models"
                      placeholder="sk-ant-..."
                      value={anthropicKey}
                      onChange={handleAnthropicKeyChange}
                      onVerify={anthropicService.verify.bind(anthropicService)}
                    />
                  </SettingsErrorBoundary>
                </Suspense>

                {/* OpenAI API Key */}
                <Suspense fallback={<ComponentLoading />}>
                  <SettingsErrorBoundary>
                    <APIKeySection
                      provider="openai"
                      title="OpenAI"
                      description="Configure your OpenAI API key to use GPT models"
                      placeholder="sk-..."
                      value={openaiKey}
                      onChange={handleOpenaiKeyChange}
                      onVerify={openaiService.verify.bind(openaiService)}
                    />
                  </SettingsErrorBoundary>
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent 
            value="integrations" 
            className="space-y-6"
            role="tabpanel"
            id="integrations-panel"
            aria-labelledby="integrations-tab"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" aria-hidden="true" />
                  Integrations
                </CardTitle>
                <CardDescription>
                  Connect external services to enhance your workflow. Integration data is stored locally for security.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                {/* Security Notice */}
                <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0">
                      🔗
                    </div>
                    <div className="text-xs sm:text-sm min-w-0">
                      <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                        Local Integration Storage
                      </div>
                      <div className="text-blue-700 dark:text-blue-300">
                        Integration tokens and data are stored locally in your browser for security. 
                        You maintain full control over your credentials.
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* GitHub Integration */}
                <Suspense fallback={<ComponentLoading />}>
                  <SettingsErrorBoundary>
                    <GitHubIntegrationSection />
                  </SettingsErrorBoundary>
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Storage Management Tab */}
          <TabsContent 
            value="storage" 
            className="space-y-6"
            role="tabpanel"
            id="storage-panel"
            aria-labelledby="storage-tab"
          >
            <Suspense fallback={<ComponentLoading />}>
              <SettingsErrorBoundary>
                <StorageManagementSection />
              </SettingsErrorBoundary>
            </Suspense>
          </TabsContent>
        </Tabs>
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastNotifications
        notifications={toast.notifications}
        onRemove={toast.removeNotification}
      />
    </SettingsErrorBoundary>
  );
}