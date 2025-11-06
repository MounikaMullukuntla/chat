/**
 * Error Logging System Exports
 * 
 * This file exports all error logging utilities for easy importing
 */

// Export all logging functions
export {
  logError,
  logAuthError,
  logApiError,
  logAdminError,
  logAppError,
  logUserError,
  logPermissionError,
  logSystemError,
  createErrorBoundaryLogger,
  setupGlobalErrorHandling
} from './logger'

// Export types and enums
export {
  ErrorType,
  ErrorSeverity,
  ErrorCategory,
  type ErrorLogEntry,
  type ClientErrorContext,
  type ServerErrorContext
} from './logger'

// Export test utilities (for development)
export { testErrorLogging } from './test-logger'