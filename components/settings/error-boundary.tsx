/**
 * Error Boundary for Settings Page
 * Catches and handles errors in the settings components
 */

"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// import { createErrorBoundaryLogger } from '@/lib/errors';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
};

type State = {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
};

export class SettingsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error(
        "Settings Error Boundary caught an error:",
        error,
        errorInfo
      );
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="mx-auto w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Settings Error
            </CardTitle>
            <CardDescription>
              Something went wrong while loading the settings page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">
                    {this.state.error?.name || "Unknown Error"}
                  </div>
                  <div className="text-sm">
                    {this.state.error?.message ||
                      "An unexpected error occurred"}
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex items-center gap-2"
                onClick={this.handleRetry}
                variant="outline"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button
                className="flex items-center gap-2"
                onClick={this.handleReload}
                variant="default"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </Button>
            </div>

            {process.env.NODE_ENV === "development" && this.state.errorInfo && (
              <details className="mt-4">
                <summary className="cursor-pointer font-medium text-muted-foreground text-sm">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
                  {this.state.error?.stack}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary for functional components
 */
export function useErrorHandler() {
  const handleError = React.useCallback(
    (error: Error, errorInfo?: ErrorInfo) => {
      // Log error to console in development
      if (process.env.NODE_ENV === "development") {
        console.error("Settings error:", error, errorInfo);
      }

      // In production, you could send to an error reporting service
      // For now, we'll just log to console
      console.error("Settings error:", error.message);
    },
    []
  );

  return handleError;
}
