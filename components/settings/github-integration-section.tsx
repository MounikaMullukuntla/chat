"use client";

import { useEffect, useState } from "react";
import {
  CheckedSquare,
  CrossIcon,
  EyeIcon,
  LoaderIcon,
} from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { storage } from "@/lib/storage/helpers";
import { cn } from "@/lib/utils";
import { GitHubVerificationService } from "@/lib/verification/github-verification-service";
import type { GitHubVerificationResult } from "@/lib/verification/types";

type ScopeValidationIndicatorsProps = {
  scopes: string[];
};

type RepositoryAccessSummaryProps = {
  repositories: GitHubVerificationResult["repositories"];
};

type TokenExpirationWarningProps = {
  expiresAt: string;
};

function TokenExpirationWarning({ expiresAt }: TokenExpirationWarningProps) {
  const expirationDate = new Date(expiresAt);
  const now = new Date();
  const daysUntilExpiration = Math.ceil(
    (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  const isExpiringSoon = daysUntilExpiration <= 30;
  const isExpired = daysUntilExpiration <= 0;

  return (
    <div
      className={cn(
        "rounded border p-2 text-xs",
        isExpired && "border-red-200 bg-red-50 text-red-800",
        isExpiringSoon &&
          !isExpired &&
          "border-yellow-200 bg-yellow-50 text-yellow-800",
        !isExpiringSoon &&
          !isExpired &&
          "border-blue-200 bg-blue-50 text-blue-800"
      )}
    >
      <div className="font-medium">
        {isExpired
          ? "⚠️ Token Expired"
          : isExpiringSoon
            ? "⚠️ Token Expiring Soon"
            : "📅 Token Expiration"}
      </div>
      <div>
        {isExpired
          ? `Expired ${Math.abs(daysUntilExpiration)} days ago on ${expirationDate.toLocaleDateString()}`
          : isExpiringSoon
            ? `Expires in ${daysUntilExpiration} days on ${expirationDate.toLocaleDateString()}`
            : `Expires on ${expirationDate.toLocaleDateString()}`}
      </div>
      {(isExpired || isExpiringSoon) && (
        <div className="mt-1">
          <a
            className="underline hover:no-underline"
            href="https://github.com/settings/tokens"
            rel="noopener noreferrer"
            target="_blank"
          >
            Generate a new token →
          </a>
        </div>
      )}
    </div>
  );
}

type RateLimitInfoProps = {
  rateLimitInfo: { remaining: number; resetTime: Date };
};

function RateLimitInfo({ rateLimitInfo }: RateLimitInfoProps) {
  const { remaining, resetTime } = rateLimitInfo;
  const now = new Date();
  const minutesUntilReset = Math.ceil(
    (resetTime.getTime() - now.getTime()) / (1000 * 60)
  );

  const isLowRemaining = remaining < 100;

  if (!isLowRemaining) {
    return null; // Only show when rate limit is getting low
  }

  return (
    <div
      className={cn(
        "rounded border p-2 text-xs",
        remaining === 0 && "border-red-200 bg-red-50 text-red-800",
        remaining > 0 &&
          remaining < 50 &&
          "border-yellow-200 bg-yellow-50 text-yellow-800",
        remaining >= 50 && "border-blue-200 bg-blue-50 text-blue-800"
      )}
    >
      <div className="font-medium">
        {remaining === 0 ? "🚫 Rate Limit Exceeded" : "⚡ Rate Limit Status"}
      </div>
      <div>
        {remaining} API calls remaining
        {minutesUntilReset > 0 && ` (resets in ${minutesUntilReset} minutes)`}
      </div>
    </div>
  );
}

function RepositoryAccessSummary({
  repositories,
}: RepositoryAccessSummaryProps) {
  if (!repositories || repositories.length === 0) {
    return null;
  }

  const stats = repositories.reduce(
    (acc, repo) => {
      if (repo.private) {
        acc.private++;
      } else {
        acc.public++;
      }

      if (repo.permissions?.admin) {
        acc.admin++;
      } else if (repo.permissions?.push) {
        acc.write++;
      } else if (repo.permissions?.pull) {
        acc.read++;
      }

      return acc;
    },
    { private: 0, public: 0, admin: 0, write: 0, read: 0 }
  );

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="space-y-1">
        <div className="font-medium text-muted-foreground">
          Repository Types:
        </div>
        <div className="flex gap-2">
          {stats.public > 0 && (
            <Badge className="text-xs" variant="outline">
              {stats.public} Public
            </Badge>
          )}
          {stats.private > 0 && (
            <Badge className="text-xs" variant="outline">
              {stats.private} Private
            </Badge>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <div className="font-medium text-muted-foreground">Access Levels:</div>
        <div className="flex flex-wrap gap-1">
          {stats.admin > 0 && (
            <Badge
              className="border-red-200 bg-red-100 text-red-800 text-xs"
              variant="default"
            >
              {stats.admin} Admin
            </Badge>
          )}
          {stats.write > 0 && (
            <Badge
              className="border-blue-200 bg-blue-100 text-blue-800 text-xs"
              variant="secondary"
            >
              {stats.write} Write
            </Badge>
          )}
          {stats.read > 0 && (
            <Badge
              className="border-green-200 bg-green-100 text-green-800 text-xs"
              variant="outline"
            >
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
    { scope: "repo", description: "Full repository access", required: true },
    {
      scope: "user",
      description: "Read user profile information",
      required: true,
    },
    {
      scope: "read:org",
      description: "Read organization membership",
      required: false,
    },
  ];

  const scopeValidation = requiredScopes.map(
    ({ scope, description, required }) => {
      const hasScope = scopes.includes(scope);
      return {
        scope,
        description,
        required,
        hasScope,
        status: hasScope ? "valid" : required ? "missing" : "optional",
      };
    }
  );

  const missingRequired = scopeValidation.filter(
    (s) => s.required && !s.hasScope
  );
  const hasAllRequired = missingRequired.length === 0;

  return (
    <div className="space-y-2">
      {!hasAllRequired && (
        <div className="rounded border border-yellow-200 bg-yellow-50 p-2 text-xs">
          <div className="mb-1 font-medium text-yellow-800">
            Scope Recommendations:
          </div>
          <div className="space-y-1 text-yellow-700">
            {missingRequired.map(({ scope, description }) => (
              <div key={scope}>
                • Missing{" "}
                <code className="rounded bg-yellow-100 px-1">{scope}</code> -{" "}
                {description}
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        aria-label="Token scope validation"
        className="grid grid-cols-1 gap-1 text-xs"
        role="list"
      >
        {scopeValidation.map(({ scope, description, status }) => (
          <div className="flex items-center gap-2" key={scope} role="listitem">
            <span
              aria-label={
                status === "valid"
                  ? "Valid scope"
                  : status === "missing"
                    ? "Missing required scope"
                    : "Optional scope not present"
              }
              className={cn(
                "flex h-3 w-3 items-center justify-center rounded-full text-xs",
                status === "valid" && "bg-green-100 text-green-600",
                status === "missing" && "bg-red-100 text-red-600",
                status === "optional" && "bg-gray-100 text-gray-500"
              )}
            >
              {status === "valid" ? "✓" : status === "missing" ? "✗" : "○"}
            </span>
            <code className="rounded bg-muted px-1 font-mono">{scope}</code>
            <span className="text-muted-foreground">{description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type GitHubIntegrationSectionProps = {
  className?: string;
};

export function GitHubIntegrationSection({
  className,
}: GitHubIntegrationSectionProps) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<GitHubVerificationResult | null>(null);
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
          expiresAt: integration.expiresAt,
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
    if (!token.trim()) {
      return;
    }

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
          expiresAt: result.expiresAt,
        });
      }
    } catch (error) {
      console.error("GitHub token verification error:", error);

      let errorMessage = "Verification failed";
      if (error instanceof Error) {
        if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorMessage =
            "Network error. Please check your connection and try again.";
        } else if (error.message.includes("timeout")) {
          errorMessage = "Request timed out. Please try again.";
        } else if (error.message.includes("rate limit")) {
          errorMessage =
            "GitHub API rate limit exceeded. Please wait before trying again.";
        } else if (
          error.message.includes("401") ||
          error.message.includes("unauthorized")
        ) {
          errorMessage =
            "Invalid GitHub token. Please check your token and try again.";
        } else {
          errorMessage = error.message;
        }
      }

      setVerificationResult({
        success: false,
        error: errorMessage,
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
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
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
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckedSquare size={14} />
            <span>GitHub token verified successfully</span>
          </div>

          {/* User Information */}
          {verificationResult.user && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-2 sm:gap-3 sm:p-3">
              <Avatar className="h-6 w-6 flex-shrink-0 sm:h-8 sm:w-8">
                <AvatarImage
                  alt={verificationResult.user.name}
                  src={verificationResult.user.avatar_url}
                />
                <AvatarFallback className="text-xs">
                  {verificationResult.user.name?.charAt(0) ||
                    verificationResult.user.login.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-green-900 text-xs sm:text-sm">
                  {verificationResult.user.name ||
                    verificationResult.user.login}
                </div>
                <div className="truncate text-green-700 text-xs">
                  @{verificationResult.user.login}
                </div>
              </div>
            </div>
          )}

          {/* Token Scopes with Validation */}
          {verificationResult.scopes &&
            verificationResult.scopes.length > 0 && (
              <div className="space-y-2">
                <div className="font-medium text-sm">Token Scopes:</div>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {verificationResult.scopes.map((scope) => {
                      const isRecommended = [
                        "repo",
                        "user",
                        "read:org",
                      ].includes(scope);
                      return (
                        <Badge
                          className={cn(
                            "text-xs",
                            isRecommended &&
                              "border-green-200 bg-green-100 text-green-800"
                          )}
                          key={scope}
                          variant={isRecommended ? "default" : "secondary"}
                        >
                          {scope}
                          {isRecommended && <span className="ml-1">✓</span>}
                        </Badge>
                      );
                    })}
                  </div>
                  {/* Scope Validation Indicators */}
                  <ScopeValidationIndicators
                    scopes={verificationResult.scopes}
                  />
                </div>
              </div>
            )}

          {/* Token Expiration and Rate Limit Info */}
          <div className="space-y-2">
            {verificationResult.expiresAt && (
              <TokenExpirationWarning
                expiresAt={verificationResult.expiresAt}
              />
            )}
            {verificationResult.rateLimitInfo && (
              <RateLimitInfo rateLimitInfo={verificationResult.rateLimitInfo} />
            )}
          </div>

          {/* Repository Access */}
          {verificationResult.repositories &&
            verificationResult.repositories.length > 0 && (
              <div className="space-y-2">
                <RepositoryAccessSummary
                  repositories={verificationResult.repositories}
                />
                <Collapsible
                  onOpenChange={setShowRepositories}
                  open={showRepositories}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      aria-controls="repositories-list"
                      aria-expanded={showRepositories}
                      className="h-auto w-full justify-between p-0 text-xs sm:text-sm"
                      size="sm"
                      variant="ghost"
                    >
                      <span className="font-medium">
                        <span className="sm:hidden">
                          Repositories ({verificationResult.repositories.length}
                          )
                        </span>
                        <span className="hidden sm:inline">
                          View All Repositories (
                          {verificationResult.repositories.length})
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "transition-transform duration-200",
                          showRepositories && "rotate-180"
                        )}
                      >
                        ▼
                      </span>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    <ScrollArea
                      aria-label="Repository list"
                      className="h-32 w-full rounded border sm:h-40"
                    >
                      <div
                        className="space-y-1 p-1 sm:p-2"
                        id="repositories-list"
                        role="list"
                      >
                        {verificationResult.repositories
                          .sort((a, b) => {
                            // Sort by permission level (admin > push > pull), then by name
                            const getPermissionLevel = (repo: typeof a) => {
                              if (repo.permissions?.admin) {
                                return 3;
                              }
                              if (repo.permissions?.push) {
                                return 2;
                              }
                              if (repo.permissions?.pull) {
                                return 1;
                              }
                              return 0;
                            };
                            const levelDiff =
                              getPermissionLevel(b) - getPermissionLevel(a);
                            return levelDiff !== 0
                              ? levelDiff
                              : a.full_name.localeCompare(b.full_name);
                          })
                          .map((repo) => (
                            <div
                              aria-label={`Repository ${repo.full_name}, ${repo.private ? "private" : "public"}, ${
                                repo.permissions?.admin
                                  ? "admin access"
                                  : repo.permissions?.push
                                    ? "write access"
                                    : repo.permissions?.pull
                                      ? "read access"
                                      : "no access"
                              }`}
                              className="flex flex-col gap-1 rounded border p-1.5 text-xs focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1 hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:p-2"
                              key={repo.full_name}
                              role="listitem"
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
                                <span className="truncate font-mono text-xs">
                                  {repo.full_name}
                                </span>
                                {repo.private && (
                                  <Badge
                                    aria-label="Private repository"
                                    className="flex-shrink-0 bg-gray-50 px-1 py-0 text-xs"
                                    variant="outline"
                                  >
                                    🔒
                                    <span className="ml-1 hidden sm:inline">
                                      Private
                                    </span>
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-1 self-start sm:ml-2 sm:self-center">
                                {repo.permissions?.admin && (
                                  <Badge
                                    aria-label="Admin access"
                                    className="border-red-200 bg-red-100 px-1 py-0 text-red-800 text-xs"
                                    variant="default"
                                  >
                                    Admin
                                  </Badge>
                                )}
                                {repo.permissions?.push &&
                                  !repo.permissions?.admin && (
                                    <Badge
                                      aria-label="Write access"
                                      className="border-blue-200 bg-blue-100 px-1 py-0 text-blue-800 text-xs"
                                      variant="secondary"
                                    >
                                      Write
                                    </Badge>
                                  )}
                                {repo.permissions?.pull &&
                                  !repo.permissions?.push &&
                                  !repo.permissions?.admin && (
                                    <Badge
                                      aria-label="Read access"
                                      className="border-green-200 bg-green-100 px-1 py-0 text-green-800 text-xs"
                                      variant="outline"
                                    >
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
          <div className="flex items-start gap-2 text-red-600 text-sm">
            <span className="mt-0.5 flex-shrink-0">
              <CrossIcon size={14} />
            </span>
            <div className="space-y-1">
              <div>{verificationResult.error || "Verification failed"}</div>
              {verificationResult.error?.includes("rate limit") && (
                <div className="text-muted-foreground text-xs">
                  GitHub API rate limit exceeded. Please wait before trying
                  again.
                </div>
              )}
              {verificationResult.error?.includes("network") && (
                <div className="text-muted-foreground text-xs">
                  Check your internet connection and try again.
                </div>
              )}
              {verificationResult.error?.includes("Invalid GitHub token") && (
                <div className="text-muted-foreground text-xs">
                  Make sure your token is valid and has not expired.
                </div>
              )}
              {verificationResult.error?.includes("expired") && (
                <div className="text-muted-foreground text-xs">
                  Please generate a new token from GitHub settings.
                </div>
              )}
            </div>
          </div>
          <Button
            className="h-8 text-xs"
            disabled={isVerifying}
            onClick={handleRetry}
            size="sm"
            variant="outline"
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
        <CardTitle className="text-base sm:text-lg">
          GitHub Integration
        </CardTitle>
        <CardDescription className="text-sm">
          Connect your GitHub account using a Personal Access Token to access
          repositories and enable GitHub features.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 sm:space-y-4 sm:p-6">
        <div className="space-y-2">
          <Label htmlFor="github-token">Personal Access Token</Label>
          <div className="relative">
            <Input
              aria-describedby="github-token-description github-token-status github-token-help"
              aria-invalid={
                verificationResult && !verificationResult.success
                  ? "true"
                  : "false"
              }
              className={cn(
                "pr-16 font-mono text-xs transition-colors sm:pr-24 sm:text-sm",
                verificationResult?.success &&
                  "border-green-200 focus-visible:ring-green-500",
                verificationResult &&
                  !verificationResult.success &&
                  "border-red-200 focus-visible:ring-red-500"
              )}
              disabled={isVerifying}
              id="github-token"
              onChange={(e) => handleTokenChange(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              type={showToken ? "text" : "password"}
              value={token}
            />
            <div className="-translate-y-1/2 absolute top-1/2 right-1 flex items-center gap-0.5 sm:right-2 sm:gap-1">
              {getStatusIcon()}
              {token && (
                <Button
                  aria-label="Clear GitHub token"
                  className="h-5 w-5 text-muted-foreground hover:text-foreground sm:h-6 sm:w-6"
                  disabled={isVerifying}
                  onClick={handleRemoveToken}
                  size="icon"
                  tabIndex={0}
                  type="button"
                  variant="ghost"
                >
                  <CrossIcon size={10} />
                </Button>
              )}
              <Button
                aria-label={
                  showToken ? "Hide GitHub token" : "Show GitHub token"
                }
                aria-pressed={showToken}
                className="h-5 w-5 text-muted-foreground hover:text-foreground sm:h-6 sm:w-6"
                disabled={isVerifying}
                onClick={() => setShowToken(!showToken)}
                size="icon"
                tabIndex={0}
                type="button"
                variant="ghost"
              >
                <span
                  className={cn(
                    "transition-opacity",
                    showToken ? "opacity-100" : "opacity-50"
                  )}
                >
                  <EyeIcon size={12} />
                </span>
              </Button>
            </div>
          </div>
          <div className="sr-only" id="github-token-description">
            Connect your GitHub account using a Personal Access Token to access
            repositories and enable GitHub features.
          </div>
          <div className="text-muted-foreground text-xs" id="github-token-help">
            Generate a token at{" "}
            <a
              aria-label="Open GitHub Personal Access Tokens settings in new tab"
              className="rounded text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              href="https://github.com/settings/tokens"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub Settings → Developer settings → Personal access tokens
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <Button
            aria-describedby="github-verify-help"
            className={cn(
              "w-full transition-all duration-200 sm:w-auto",
              isVerifying && "cursor-not-allowed",
              verificationResult?.success &&
                "border-green-200 bg-green-50 text-green-700 hover:bg-green-100",
              verificationResult &&
                !verificationResult.success &&
                "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            )}
            disabled={!token.trim() || isVerifying}
            onClick={handleVerify}
            size="sm"
            variant="outline"
          >
            {isVerifying ? (
              <>
                <span aria-hidden="true" className="mr-2 animate-spin">
                  <LoaderIcon size={14} />
                </span>
                Verifying...
              </>
            ) : verificationResult?.success ? (
              <>
                <span aria-hidden="true" className="mr-2">
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
            <div
              className="text-center text-muted-foreground text-xs sm:text-left"
              id="github-verify-help"
            >
              Click verify to test your GitHub token
            </div>
          )}
        </div>

        <div aria-live="polite" id="github-token-status" role="status">
          {getStatusMessage()}
        </div>

        {/* Help Section */}
        <Separator />
        <div className="space-y-2">
          <div className="font-medium text-xs sm:text-sm">
            Required Token Permissions:
          </div>
          <div className="space-y-1 text-muted-foreground text-xs">
            <div className="flex flex-wrap items-center gap-1">
              • <code className="rounded bg-muted px-1 text-xs">repo</code>
              <span className="hidden sm:inline">- Full repository access</span>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              • <code className="rounded bg-muted px-1 text-xs">user</code>
              <span className="hidden sm:inline">
                - Read user profile information
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              • <code className="rounded bg-muted px-1 text-xs">read:org</code>
              <span className="hidden sm:inline">
                - Read organization membership (optional)
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
