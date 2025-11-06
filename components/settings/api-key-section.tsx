"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EyeIcon, LoaderIcon, CheckedSquare, CrossIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { VerificationResult } from "@/lib/verification/types";

interface APIKeySectionProps {
  provider: 'google' | 'anthropic' | 'openai';
  title: string;
  description: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onVerify: (key: string) => Promise<VerificationResult>;
  className?: string;
}

export function APIKeySection({
  provider,
  title,
  description,
  placeholder,
  value,
  onChange,
  onVerify,
  className
}: APIKeySectionProps) {
  const [showKey, setShowKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  const handleVerify = async () => {
    if (!value.trim()) return;
    
    setIsVerifying(true);
    setVerificationResult(null);
    
    try {
      const result = await onVerify(value.trim());
      setVerificationResult(result);
    } catch (error) {
      console.error(`${provider} API key verification error:`, error);
      
      let errorMessage = 'Verification failed';
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
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
          Verifying API key...
        </div>
      );
    }
    
    if (verificationResult?.success) {
      return (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckedSquare size={14} />
          <span>API key verified successfully</span>
          {verificationResult.details && (
            <span className="text-xs text-muted-foreground">
              ({verificationResult.details.model || 'Connected'})
            </span>
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
                  Please wait a moment before trying again.
                </div>
              )}
              {verificationResult.error?.includes('network') && (
                <div className="text-xs text-muted-foreground">
                  Check your internet connection and try again.
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
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
        <div className="space-y-2">
          <Label htmlFor={`${provider}-api-key`}>API Key</Label>
          <div className="relative">
            <Input
              id={`${provider}-api-key`}
              type={showKey ? "text" : "password"}
              placeholder={placeholder}
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                // Clear verification result when user changes the key
                if (verificationResult) {
                  setVerificationResult(null);
                }
              }}
              className={cn(
                "pr-16 sm:pr-24 transition-colors text-sm",
                verificationResult?.success && "border-green-200 focus-visible:ring-green-500",
                verificationResult && !verificationResult.success && "border-red-200 focus-visible:ring-red-500"
              )}
              disabled={isVerifying}
              aria-describedby={`${provider}-api-key-description ${provider}-api-key-status`}
              aria-invalid={verificationResult && !verificationResult.success ? "true" : "false"}
            />
            <div className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 sm:gap-1">
              {getStatusIcon()}
              {value && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    onChange('');
                    setVerificationResult(null);
                  }}
                  aria-label={`Clear ${title} API key`}
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
                onClick={() => setShowKey(!showKey)}
                aria-label={showKey ? `Hide ${title} API key` : `Show ${title} API key`}
                aria-pressed={showKey}
                disabled={isVerifying}
                tabIndex={0}
              >
                <span className={cn(
                  "transition-opacity",
                  showKey ? "opacity-100" : "opacity-50"
                )}>
                  <EyeIcon size={12} />
                </span>
              </Button>
            </div>
          </div>
          <div id={`${provider}-api-key-description`} className="sr-only">
            {description}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <Button
            onClick={handleVerify}
            disabled={!value.trim() || isVerifying}
            variant="outline"
            size="sm"
            className={cn(
              "transition-all duration-200 w-full sm:w-auto",
              isVerifying && "cursor-not-allowed",
              verificationResult?.success && "border-green-200 bg-green-50 text-green-700 hover:bg-green-100",
              verificationResult && !verificationResult.success && "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            )}
            aria-describedby={`${provider}-verify-help`}
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
                Verified
              </>
            ) : (
              <>
                <span className="sm:hidden">Verify</span>
                <span className="hidden sm:inline">Verify {title} API Key</span>
              </>
            )}
          </Button>
          
          {value.trim() && !isVerifying && !verificationResult && (
            <div id={`${provider}-verify-help`} className="text-xs text-muted-foreground text-center sm:text-left">
              Click verify to test your API key
            </div>
          )}
        </div>
        
        <div id={`${provider}-api-key-status`} role="status" aria-live="polite">
          {getStatusMessage()}
        </div>
      </CardContent>
    </Card>
  );
}