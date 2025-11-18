/**
 * Logging System Exports
 *
 * Centralized exports for error logging and activity logging
 */

// Error Logging Exports (re-export from errors module)
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
} from "../errors/logger";
// Activity Logging Exports
export {
  ActivityCategory,
  type AgentActivityLog,
  AgentOperationCategory,
  AgentOperationType,
  AgentType,
  createCorrelationId,
  isAgentActivityLoggingEnabled,
  isUserActivityLoggingEnabled,
  logAgentActivity,
  logUserActivity,
  PerformanceTracker,
  type UserActivityLog,
  UserActivityType,
} from "./activity-logger";
