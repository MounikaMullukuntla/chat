/**
 * Comprehensive Error Logging System
 *
 * This module provides centralized error logging functionality for the entire application.
 * It logs errors to the database with proper categorization and context information.
 */

import type { User } from "@supabase/supabase-js";

// Error types for classification
export enum ErrorType {
  AUTH = "auth",
  API = "api",
  ADMIN = "admin",
  APP = "app",
  USER = "user",
  PERMISSION = "permission",
  SYSTEM = "system",
}

// Error severity levels
export enum ErrorSeverity {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical",
}

// Error categories for more specific classification
export enum ErrorCategory {
  // Auth related
  LOGIN_FAILED = "login_failed",
  REGISTRATION_FAILED = "registration_failed",
  SESSION_EXPIRED = "session_expired",
  UNAUTHORIZED_ACCESS = "unauthorized_access",
  INVALID_TOKEN = "invalid_token",

  // API related
  API_REQUEST_FAILED = "api_request_failed",
  API_TIMEOUT = "api_timeout",
  API_RATE_LIMIT = "api_rate_limit",
  INVALID_REQUEST = "invalid_request",

  // Admin related
  CONFIG_UPDATE_FAILED = "config_update_failed",
  ADMIN_ACTION_FAILED = "admin_action_failed",
  PERMISSION_DENIED = "permission_denied",

  // App related
  COMPONENT_ERROR = "component_error",
  NAVIGATION_ERROR = "navigation_error",
  STATE_ERROR = "state_error",

  // User related
  USER_INPUT_ERROR = "user_input_error",
  VALIDATION_ERROR = "validation_error",

  // System related
  DATABASE_ERROR = "database_error",
  NETWORK_ERROR = "network_error",
  FILE_SYSTEM_ERROR = "file_system_error",
  EXTERNAL_SERVICE_ERROR = "external_service_error",

  // File upload/storage related
  FILE_UPLOAD_FAILED = "file_upload_failed",
  FILE_TOO_LARGE = "file_too_large",
  FILE_TYPE_NOT_SUPPORTED = "file_type_not_supported",
  FILE_PROCESSING_FAILED = "file_processing_failed",
  STORAGE_ACCESS_DENIED = "storage_access_denied",
  SIGNED_URL_GENERATION_FAILED = "signed_url_generation_failed",
  SIGNED_URL_EXPIRED = "signed_url_expired",
  CACHE_WRITE_FAILED = "cache_write_failed",
  CACHE_READ_FAILED = "cache_read_failed",
}

// Interface for error log entry
export type ErrorLogEntry = {
  user_id?: string;
  error_type: ErrorType;
  error_category: ErrorCategory;
  error_message: string;
  error_details?: Record<string, any>;
  request_path?: string;
  request_method?: string;
  user_agent?: string;
  ip_address?: string;
  session_id?: string;
  severity?: ErrorSeverity;
};

// Interface for client-side error context
export type ClientErrorContext = {
  url?: string;
  userAgent?: string;
  timestamp?: string;
  componentStack?: string;
  errorBoundary?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  reason?: any;
  [key: string]: any; // Allow additional metadata
};

// Interface for server-side error context
export type ServerErrorContext = {
  request?: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: any;
  };
  response?: {
    status?: number;
    headers?: Record<string, string>;
  };
  user?: User;
  session?: any;
};

/**
 * Log an error to the database
 *
 * @param entry - Error log entry data
 * @returns Promise that resolves when error is logged
 */
export async function logError(entry: ErrorLogEntry): Promise<void> {
  try {
    // Always use Supabase client for consistency across all environments
    // The service role key will bypass RLS policies
    await logErrorSupabase(entry);
  } catch (err) {
    // Fallback to console logging if logging system fails
    console.error("Error logging system failed:", err);
    console.error("Original error:", entry);
  }
}

/**
 * Log error using Supabase client (Edge Runtime and client-side)
 */
async function logErrorSupabase(entry: ErrorLogEntry): Promise<void> {
  try {
    // Determine if running in browser or server context
    const isBrowser = typeof window !== "undefined";

    let supabase;

    if (isBrowser) {
      // Client-side: use browser client
      const { createBrowserClient } = await import("@supabase/ssr");
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !anonKey) {
        throw new Error("Supabase environment variables not defined");
      }

      supabase = createBrowserClient(supabaseUrl, anonKey);
    } else {
      // Server-side: use admin client with service role key
      const { createAdminClient } = await import("@/lib/db/supabase-client");
      supabase = createAdminClient();
    }

    const { error } = await supabase.from("error_logs").insert({
      user_id: entry.user_id || null,
      error_type: entry.error_type,
      error_category: entry.error_category,
      error_message: entry.error_message,
      error_details: entry.error_details || null,
      request_path: entry.request_path || null,
      request_method: entry.request_method || null,
      user_agent: entry.user_agent || null,
      ip_address: entry.ip_address || null,
      session_id: entry.session_id || null,
      severity: entry.severity || ErrorSeverity.ERROR,
      resolved: false,
      created_at: new Date().toISOString(),
    });

    if (error) {
      // Fallback to console logging if database logging fails
      console.error("Failed to log error to database:", error);
      console.error("Original error:", entry);
    }
  } catch (err) {
    console.error("Failed to log error via Supabase client:", err);
    throw err;
  }
}

/**
 * Log authentication errors
 */
export async function logAuthError(
  category: ErrorCategory,
  message: string,
  details?: Record<string, any>,
  user_id?: string,
  severity: ErrorSeverity = ErrorSeverity.ERROR
): Promise<void> {
  await logError({
    user_id,
    error_type: ErrorType.AUTH,
    error_category: category,
    error_message: message,
    error_details: details,
    severity,
  });
}

/**
 * Log API errors
 */
export async function logApiError(
  category: ErrorCategory,
  message: string,
  context?: ServerErrorContext,
  severity: ErrorSeverity = ErrorSeverity.ERROR
): Promise<void> {
  await logError({
    user_id: context?.user?.id,
    error_type: ErrorType.API,
    error_category: category,
    error_message: message,
    error_details: {
      request: context?.request,
      response: context?.response,
      stack: context ? new Error().stack : undefined,
    },
    request_path: context?.request?.url,
    request_method: context?.request?.method,
    user_agent: context?.request?.headers?.["user-agent"],
    session_id: context?.session?.id,
    severity,
  });
}

/**
 * Log admin-related errors
 */
export async function logAdminError(
  category: ErrorCategory,
  message: string,
  details?: Record<string, any>,
  user_id?: string,
  severity: ErrorSeverity = ErrorSeverity.ERROR
): Promise<void> {
  await logError({
    user_id,
    error_type: ErrorType.ADMIN,
    error_category: category,
    error_message: message,
    error_details: details,
    severity,
  });
}

/**
 * Log application errors (client-side)
 */
export async function logAppError(
  category: ErrorCategory,
  message: string,
  context?: ClientErrorContext,
  user_id?: string,
  severity: ErrorSeverity = ErrorSeverity.ERROR
): Promise<void> {
  await logError({
    user_id,
    error_type: ErrorType.APP,
    error_category: category,
    error_message: message,
    error_details: {
      ...context,
      stack: new Error().stack,
    },
    request_path:
      context?.url ||
      (typeof window !== "undefined" ? window.location.pathname : undefined),
    user_agent:
      context?.userAgent ||
      (typeof navigator !== "undefined" ? navigator.userAgent : undefined),
    severity,
  });
}

/**
 * Log user-related errors
 */
export async function logUserError(
  category: ErrorCategory,
  message: string,
  details?: Record<string, any>,
  user_id?: string,
  severity: ErrorSeverity = ErrorSeverity.WARNING
): Promise<void> {
  await logError({
    user_id,
    error_type: ErrorType.USER,
    error_category: category,
    error_message: message,
    error_details: details,
    severity,
  });
}

/**
 * Log permission-related errors
 */
export async function logPermissionError(
  category: ErrorCategory,
  message: string,
  details?: Record<string, any>,
  user_id?: string,
  severity: ErrorSeverity = ErrorSeverity.WARNING
): Promise<void> {
  await logError({
    user_id,
    error_type: ErrorType.PERMISSION,
    error_category: category,
    error_message: message,
    error_details: details,
    severity,
  });
}

/**
 * Log system errors
 */
export async function logSystemError(
  category: ErrorCategory,
  message: string,
  details?: Record<string, any>,
  severity: ErrorSeverity = ErrorSeverity.CRITICAL
): Promise<void> {
  await logError({
    error_type: ErrorType.SYSTEM,
    error_category: category,
    error_message: message,
    error_details: details,
    severity,
  });
}

/**
 * Create a React Error Boundary error logger
 */
export function createErrorBoundaryLogger(user_id?: string) {
  return (error: Error, errorInfo: { componentStack: string }) => {
    logAppError(
      ErrorCategory.COMPONENT_ERROR,
      error.message,
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: "React Error Boundary",
        timestamp: new Date().toISOString(),
      },
      user_id,
      ErrorSeverity.ERROR
    );
  };
}

/**
 * Create a global error handler for unhandled errors
 */
export function setupGlobalErrorHandling(user_id?: string) {
  if (typeof window !== "undefined") {
    // Handle unhandled JavaScript errors
    window.addEventListener("error", (event) => {
      logAppError(
        ErrorCategory.COMPONENT_ERROR,
        event.error?.message || "Unhandled JavaScript error",
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
          timestamp: new Date().toISOString(),
        },
        user_id,
        ErrorSeverity.ERROR
      );
    });

    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      logAppError(
        ErrorCategory.COMPONENT_ERROR,
        event.reason?.message || "Unhandled Promise rejection",
        {
          reason: event.reason,
          stack: event.reason?.stack,
          timestamp: new Date().toISOString(),
        },
        user_id,
        ErrorSeverity.ERROR
      );
    });
  }
}
