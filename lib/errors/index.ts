/**
 * Error Logging System Exports
 *
 * This file exports all error logging utilities for easy importing
 */

// Export all logging functions
// Export types and enums
export {
  type ClientErrorContext,
  createErrorBoundaryLogger,
  ErrorCategory,
  type ErrorLogEntry,
  ErrorSeverity,
  ErrorType,
  logAdminError,
  logApiError,
  logAppError,
  logAuthError,
  logError,
  logPermissionError,
  logSystemError,
  logUserError,
  type ServerErrorContext,
  setupGlobalErrorHandling,
} from "./logger";

// Export test utilities (for development)
export { testErrorLogging } from "./test-logger";
