"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EyeIcon, LoaderIcon, CheckedSquare, CrossIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { GitHubVerificationService } from "@/lib/verification/github-verification-service";
import { storage } from "@/lib/storage/helpers";
import type { GitHubVerificationResult } from "@/lib/verification/types";

interface ScopeValidationIndicatorsProps {
  scopes: string[];
}

interface RepositoryAccessSummaryProps {
  repositories: GitHubVerificationResult['repositories'];
}

interface TokenExpirationWarningProps {
  expiresAt: string;
}

function TokenExpirationWarning({ expiresAt }: TokenExpirationWarningProps) {
  const expirationDate = new Date(expiresAt);
  const now = new Date();
  const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  const isExpiringSoon = daysUntilExpiration <= 30;
  const isExpired = daysUntilExpiration <= 0;

  return (
    <div className={cn(
      "p-2 rounded text-xs border",
      isExpired && "bg-red-50 border-red-200 text-red-800",
      isExpiringSoon && !isExpired && "bg-yellow-50 border-yellow-200 text-yellow-800",
      !isExpiringSoon && !isExpired && "bg-blue-50 border-blue-200 text-blue-800"
    )}>
      <div className="font-medium">
        {isExpired ? '⚠️ Token Expired' : isExpiringSoon ? '⚠️ Token Expiring Soon' : '📅 Token Expiration'}
      </div>
      <div>
        {isExpired 
          ? `Expired ${Math.abs(daysUntilExpiration)} days ago on ${expirationDate.toLocaleDateString()}`
          : isExpiringSoon
          ? `Expires in ${daysUntilExpiration} days on ${expirationDate.toLocaleDateString()}`
          : `Expires on ${expirationDate.toLocaleDateString()}`
        }
      </div>
      {(isExpired || isExpiringSoon) && (
        <div className="mt-1">
          <a 
            href="https://github.com/settings/tokens" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            Generate a new token →
          </a>
        </div>
      )}
    </div>
  );
}

interface RateLimitInfoProps {
  rateLimitInfo: { remaining: number; resetTime: Date };
}

function RateLimitInfo({ rateLimitInfo }: RateLimitInfoProps) {
  const { remaining, resetTime } = rateLimitInfo;
  const now = new Date();
  const minutesUntilReset = Math.ceil((resetTime.getTime() - now.getTime()) / (1000 * 60));
  
  const isLowRemaining = remaining < 100;
  
  if (!isLowRemaining) {
    return null; // Only show when rate limit is getting low
  }

  return (
    <div className={cn(
      "p-2 rounded text-xs border",
      remaining === 0 && "bg-red-50 border-red-200 text-red-800",
      remaining > 0 && remaining < 50 && "bg-yellow-50 border-yellow-200 text-yellow-800",
      remaining >= 50 && "bg-blue-50 border-blue-200 text-blue-800"
    )}>
      <div className="font-medium">
        {remaining === 0 ? '🚫 Rate Limit Exceeded' : '⚡ Rate Limit Status'}
      </div>
      <div>
        {remaining} API calls remaining
        {minutesUntilReset > 0 && ` (resets in ${minutesUntilReset} minutes)`}
      </div>
    </div>
  );
}

function RepositoryAccessSummary({ repositories }: RepositoryAccessSummaryProps) {
  if (!repositories || repositories.length === 0) {
    return null;
  }

  const stats = repositories.reduce((acc, repo) => {
    if (repo.private) acc.private++;
    else acc.public++;
    
    if (repo.permissions?.admin) acc.admin++;
    else if (repo.permissions?.push) acc.write++;
    else if (repo.permissions?.pull) acc.read++;
    
    return acc;
  }, { private: 0, public: 0, admin: 0, write: 0, read: 0 });

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="space-y-1">
        <div className="font-medium text-muted-foreground">Repository Types:</div>
        <div className="flex gap-2">
          {stats.public > 0 && (
            <Badge variant="outline" className="text-xs">
              {stats.public} Public
            </Badge>
          )}
          {stats.private > 0 && (
            <Badge variant="outline" className="text-xs">
              {stats.private} Private
            </Badge>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <div className="font-medium text-muted-foreground">Access Levels:</div>
        <div className="flex gap-1 flex-wrap">
          {stats.admin > 0 && (
            <Badge variant="default" className="text-xs bg-red-100 text-red-800 border-red-200">
              {stats.admin} Admin
            </Badge>
          )}
          {stats.write > 0 && (
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
              {stats.write} Write
            </Badge>
          )}
          {stats.read > 0 && (
            <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-200">
              {stats.read} Read
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function ScopeValidationIndicators({ scopes }: ScopeValidationIndicatorsProps) {
  const requiredScopes = [
    { scope: 'repo', description: 'Full repository access', required: true },
    { scope: 'user', description: 'Read user profile information', required: true },
    { scope: 'read:org', description: 'Read organization membership', required: false }
  ];

  const scopeValidation = requiredScopes.map(({ scope, description, required }) => {
    const hasScope = scopes.includes(scope);
    return {
      scope,
      description,
      required,
      hasScope,
      status: hasScope ? 'valid' : (required ? 'missing' : 'optional')
    };
  });

  const missingRequired = scopeValidation.filter(s => s.required && !s.hasScope);
  const hasAllRequired = missingRequired.length === 0;

  return (
    <div className="space-y-2">
      {!hasAllRequired && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
          <div className="font-medium text-yellow-800 mb-1">Scope Recommendations:</div>
          <div className="space-y-1 text-yellow-700">
            {missingRequired.map(({ scope, description }) => (
              <div key={scope}>
                • Missing <code className="bg-yellow-100 px-1 rounded">{scope}</code> - {description}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-1 text-xs" role="list" aria-label="Token scope validation">
        {scopeValidation.map(({ scope, description, status }) => (
          <div key={scope} className="flex items-center gap-2" role="listitem">
            <span 
              className={cn(
                "w-3 h-3 rounded-full flex items-center justify-center text-xs",
                status === 'valid' && "bg-green-100 text-green-600",
                status === 'missing' && "bg-red-100 text-red-600",
                status === 'optional' && "bg-gray-100 text-gray-500"
              )}
              aria-label={
                status === 'valid' ? 'Valid scope' : 
                status === 'missing' ? 'Missing required scope' : 
                'Optional scope not present'
              }
            >
              {status === 'valid' ? '✓' : status === 'missing' ? '✗' : '○'}
            </span>
            <code className="bg-muted px-1 rounded font-mono">{scope}</code>
            <span className="text-muted-foreground">{description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface GitHubIntegrationSectionProps {
  className?: string;
}

export function GitHubIntegrationSection({ className }: GitHubIntegrationSectionProps) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<GitHubVerificationResult | null>(null);
  const [showRepositories, setShowRepositories] = useState(false);
  
  const githubService = new GitHubVerificationService();

  // Load existing token on mount
  useEffect(() => {
    const existingToken = storage.github.getToken();
    if (existingToken) {
      setToken(existingToken);
      // Load cached verification result if available
      const integration = storage.github.getIntegration();
      if (integration?.lastVerified && integration.user) {
        setVerificationResult({
          success: true,
          user: integration.user,
          repositories: integration.repositories || [],
          scopes: integration.scopes || [],
          expiresAt: integration.expiresAt
        });
      }
    }
  }, []);

  const handleTokenChange = (value: string) => {
    setToken(value);
    // Clear verification result when user changes the token
    if (verificationResult) {
      setVerificationResult(null);
    }
  };

  const handleVerify = async () => {
    if (!token.trim()) return;
    
    setIsVerifying(true);
    setVerificationResult(null);
    
    try {
      const result = await githubService.verify(token.trim());
      setVerificationResult(result);
      
      if (result.success) {
        // Save token and cache verification result
        storage.github.setToken(token.trim());
        storage.github.updateIntegration({
          lastVerified: new Date().toISOString(),
          user: result.user,
          repositories: result.repositories,
          scopes: result.scopes,
          expiresAt: result.expiresAt
        });
      }
    } catch (error) {
      console.error('GitHub token verification error:', error);
      
      let errorMessage = 'Verification failed';
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        } else if (error.message.includes('rate limit')) {
          errorMessage = 'GitHub API rate limit exceeded. Please wait before trying again.';
        } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
          errorMessage = 'Invalid GitHub token. Please check your token and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setVerificationResult({
        success: false,
        error: errorMessage
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRetry = () => {
    setVerificationResult(null);
    handleVerify();
  };

  const handleRemoveToken = () => {
    setToken("");
    setVerificationResult(null);
    storage.github.removeToken();
  };

  const getStatusIcon = () => {
    if (isVerifying) {
      return (
        <span className="animate-spin text-muted-foreground">
          <LoaderIcon size={16} />
        </span>
      );
    }
    
    if (verificationResult?.success) {
      return (
        <span className="text-green-600">
          <CheckedSquare size={16} />
        </span>
      );
    }
    
    if (verificationResult && !verificationResult.success) {
      return (
        <span className="text-red-600">
          <CrossIcon size={16} />
        </span>
      );
    }
    
    return null;
  };

  const getStatusMessage = () => {
    if (isVerifying) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="animate-spin">
            <LoaderIcon size={14} />
          </span>
          Verifying GitHub token...
        </div>
      );
    }
    
    if (verificationResult?.success) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckedSquare size={14} />
            <span>GitHub token verified successfully</span>
          </div>
          
          {/* User Information */}
          {verificationResult.user && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
              <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                <AvatarImage src={verificationResult.user.avatar_url} alt={verificationResult.user.name} />
                <AvatarFallback className="text-xs">
                  {verificationResult.user.name?.charAt(0) || verificationResult.user.login.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm font-medium text-green-900 truncate">
                  {verificationResult.user.name || verificationResult.user.login}
                </div>
                <div className="text-xs text-green-700 truncate">
                  @{verificationResult.user.login}
                </div>
              </div>
            </div>
          )}
          
          {/* Token Scopes with Validation */}
          {verificationResult.scopes && verificationResult.scopes.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Token Scopes:</div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {verificationResult.scopes.map((scope) => {
                    const isRecommended = ['repo', 'user', 'read:org'].includes(scope);
                    return (
                      <Badge 
                        key={scope} 
                        variant={isRecommended ? "default" : "secondary"} 
                        className={cn(
                          "text-xs",
                          isRecommended && "bg-green-100 text-green-800 border-green-200"
                        )}
                      >
                        {scope}
                        {isRecommended && <span className="ml-1">✓</span>}
                      </Badge>
                    );
                  })}
                </div>
                {/* Scope Validation Indicators */}
                <ScopeValidationIndicators scopes={verificationResult.scopes} />
              </div>
            </div>
          )}
          
          {/* Token Expiration and Rate Limit Info */}
          <div className="space-y-2">
            {verificationResult.expiresAt && (
              <TokenExpirationWarning expiresAt={verificationResult.expiresAt} />
            )}
            {verificationResult.rateLimitInfo && (
              <RateLimitInfo rateLimitInfo={verificationResult.rateLimitInfo} />
            )}
          </div>
          
          {/* Repository Access */}
          {verificationResult.repositories && verificationResult.repositories.length > 0 && (
            <div className="space-y-2">
              <RepositoryAccessSummary repositories={verificationResult.repositories} />
              <Collapsible open={showRepositories} onOpenChange={setShowRepositories}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-between p-0 h-auto text-xs sm:text-sm"
                    aria-expanded={showRepositories}
                    aria-controls="repositories-list"
                  >
                    <span className="font-medium">
                      <span className="sm:hidden">Repositories ({verificationResult.repositories.length})</span>
                      <span className="hidden sm:inline">View All Repositories ({verificationResult.repositories.length})</span>
                    </span>
                    <span 
                      className={cn(
                        "transition-transform duration-200",
                        showRepositories && "rotate-180"
                      )}
                      aria-hidden="true"
                    >
                      ▼
                    </span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  <ScrollArea className="h-32 sm:h-40 w-full rounded border" aria-label="Repository list">
                    <div className="p-1 sm:p-2 space-y-1" id="repositories-list" role="list">
                      {verificationResult.repositories
                        .sort((a, b) => {
                          // Sort by permission level (admin > push > pull), then by name
                          const getPermissionLevel = (repo: typeof a) => {
                            if (repo.permissions?.admin) return 3;
                            if (repo.permissions?.push) return 2;
                            if (repo.permissions?.pull) return 1;
                            return 0;
                          };
                          const levelDiff = getPermissionLevel(b) - getPermissionLevel(a);
                          return levelDiff !== 0 ? levelDiff : a.full_name.localeCompare(b.full_name);
                        })
                        .map((repo) => (
                          <div 
                            key={repo.full_name} 
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs p-1.5 sm:p-2 hover:bg-muted rounded border focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1 gap-1 sm:gap-0"
                            role="listitem"
                            tabIndex={0}
                            aria-label={`Repository ${repo.full_name}, ${repo.private ? 'private' : 'public'}, ${
                              repo.permissions?.admin ? 'admin access' :
                              repo.permissions?.push ? 'write access' :
                              repo.permissions?.pull ? 'read access' : 'no access'
                            }`}
                          >
                            <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
                              <span className="font-mono truncate text-xs">{repo.full_name}</span>
                              {repo.private && (
                                <Badge variant="outline" className="text-xs px-1 py-0 bg-gray-50 flex-shrink-0" aria-label="Private repository">
                                  🔒
                                  <span className="hidden sm:inline ml-1">Private</span>
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1 sm:ml-2 self-start sm:self-center">
                              {repo.permissions?.admin && (
                                <Badge variant="default" className="text-xs px-1 py-0 bg-red-100 text-red-800 border-red-200" aria-label="Admin access">
                                  Admin
                                </Badge>
                              )}
                              {repo.permissions?.push && !repo.permissions?.admin && (
                                <Badge variant="secondary" className="text-xs px-1 py-0 bg-blue-100 text-blue-800 border-blue-200" aria-label="Write access">
                                  Write
                                </Badge>
                              )}
                              {repo.permissions?.pull && !repo.permissions?.push && !repo.permissions?.admin && (
                                <Badge variant="outline" className="text-xs px-1 py-0 bg-green-100 text-green-800 border-green-200" aria-label="Read access">
                                  Read
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>
      );
    }
    
    if (verificationResult && !verificationResult.success) {
      return (
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm text-red-600">
            <span className="mt-0.5 flex-shrink-0">
              <CrossIcon size={14} />
            </span>
            <div className="space-y-1">
              <div>{verificationResult.error || 'Verification failed'}</div>
              {verificationResult.error?.includes('rate limit') && (
                <div className="text-xs text-muted-foreground">
                  GitHub API rate limit exceeded. Please wait before trying again.
                </div>
              )}
              {verificationResult.error?.includes('network') && (
                <div className="text-xs text-muted-foreground">
                  Check your internet connection and try again.
                </div>
              )}
              {verificationResult.error?.includes('Invalid GitHub token') && (
                <div className="text-xs text-muted-foreground">
                  Make sure your token is valid and has not expired.
                </div>
              )}
              {verificationResult.error?.includes('expired') && (
                <div className="text-xs text-muted-foreground">
                  Please generate a new token from GitHub settings.
                </div>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="h-8 text-xs"
            disabled={isVerifying}
          >
            Retry Verification
          </Button>
        </div>
      );
    }
    
    return null;
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">GitHub Integration</CardTitle>
        <CardDescription className="text-sm">
          Connect your GitHub account using a Personal Access Token to access repositories and enable GitHub features.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
        <div className="space-y-2">
          <Label htmlFor="github-token">Personal Access Token</Label>
          <div className="relative">
            <Input
              id="github-token"
              type={showToken ? "text" : "password"}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => handleTokenChange(e.target.value)}
              className={cn(
                "pr-16 sm:pr-24 transition-colors font-mono text-xs sm:text-sm",
                verificationResult?.success && "border-green-200 focus-visible:ring-green-500",
                verificationResult && !verificationResult.success && "border-red-200 focus-visible:ring-red-500"
              )}
              disabled={isVerifying}
              aria-describedby="github-token-description github-token-status github-token-help"
              aria-invalid={verificationResult && !verificationResult.success ? "true" : "false"}
            />
            <div className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 sm:gap-1">
              {getStatusIcon()}
              {token && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground hover:text-foreground"
                  onClick={handleRemoveToken}
                  aria-label="Clear GitHub token"
                  disabled={isVerifying}
                  tabIndex={0}
                >
                  <CrossIcon size={10} />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setShowToken(!showToken)}
                aria-label={showToken ? "Hide GitHub token" : "Show GitHub token"}
                aria-pressed={showToken}
                disabled={isVerifying}
                tabIndex={0}
              >
                <span className={cn(
                  "transition-opacity",
                  showToken ? "opacity-100" : "opacity-50"
                )}>
                  <EyeIcon size={12} />
                </span>
              </Button>
            </div>
          </div>
          <div id="github-token-description" className="sr-only">
            Connect your GitHub account using a Personal Access Token to access repositories and enable GitHub features.
          </div>
          <div id="github-token-help" className="text-xs text-muted-foreground">
            Generate a token at{" "}
            <a 
              href="https://github.com/settings/tokens" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              aria-label="Open GitHub Personal Access Tokens settings in new tab"
            >
              GitHub Settings → Developer settings → Personal access tokens
            </a>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <Button
            onClick={handleVerify}
            disabled={!token.trim() || isVerifying}
            variant="outline"
            size="sm"
            className={cn(
              "transition-all duration-200 w-full sm:w-auto",
              isVerifying && "cursor-not-allowed",
              verificationResult?.success && "border-green-200 bg-green-50 text-green-700 hover:bg-green-100",
              verificationResult && !verificationResult.success && "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            )}
            aria-describedby="github-verify-help"
          >
            {isVerifying ? (
              <>
                <span className="mr-2 animate-spin" aria-hidden="true">
                  <LoaderIcon size={14} />
                </span>
                Verifying...
              </>
            ) : verificationResult?.success ? (
              <>
                <span className="mr-2" aria-hidden="true">
                  <CheckedSquare size={14} />
                </span>
                Connected
              </>
            ) : (
              <>
                <span className="sm:hidden">Verify Token</span>
                <span className="hidden sm:inline">Verify GitHub Token</span>
              </>
            )}
          </Button>
          
          {token.trim() && !isVerifying && !verificationResult && (
            <div id="github-verify-help" className="text-xs text-muted-foreground text-center sm:text-left">
              Click verify to test your GitHub token
            </div>
          )}
        </div>
        
        <div id="github-token-status" role="status" aria-live="polite">
          {getStatusMessage()}
        </div>
        
        {/* Help Section */}
        <Separator />
        <div className="space-y-2">
          <div className="text-xs sm:text-sm font-medium">Required Token Permissions:</div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex flex-wrap items-center gap-1">
              • <code className="bg-muted px-1 rounded text-xs">repo</code> 
              <span className="hidden sm:inline">- Full repository access</span>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              • <code className="bg-muted px-1 rounded text-xs">user</code> 
              <span className="hidden sm:inline">- Read user profile information</span>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              • <code className="bg-muted px-1 rounded text-xs">read:org</code> 
              <span className="hidden sm:inline">- Read organization membership (optional)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}