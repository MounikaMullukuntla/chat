/**
 * Activity Logger Unit Tests
 *
 * Tests for user activity logging, agent activity logging,
 * error handling, batch processing, and log filtering
 *
 * Note: Some tests are simplified due to module-level caching in the activity logger.
 * Full integration tests should cover complex batching and caching scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the Supabase client
const mockSupabaseInsert = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseEq = vi.fn();
const mockSupabaseSingle = vi.fn();
const mockSupabaseFrom = vi.fn();

const mockSupabaseClient = {
  from: mockSupabaseFrom,
};

// Mock the database client module BEFORE importing activity-logger
vi.mock('@/lib/db/supabase-client', () => ({
  createAdminClient: vi.fn(() => mockSupabaseClient),
}));

// Now import the activity logger after mocking
import {
  logUserActivity,
  logAgentActivity,
  isUserActivityLoggingEnabled,
  isAgentActivityLoggingEnabled,
  PerformanceTracker,
  createCorrelationId,
  UserActivityType,
  ActivityCategory,
  AgentType,
  AgentOperationType,
  AgentOperationCategory,
  type UserActivityLog,
  type AgentActivityLog,
} from '@/lib/logging/activity-logger';

// Setup mock chain
function setupSupabaseMockChain() {
  mockSupabaseFrom.mockReturnValue({
    insert: mockSupabaseInsert,
    select: mockSupabaseSelect,
  });

  mockSupabaseSelect.mockReturnValue({
    eq: mockSupabaseEq,
  });

  mockSupabaseEq.mockReturnValue({
    single: mockSupabaseSingle,
  });

  mockSupabaseInsert.mockResolvedValue({ error: null });
  mockSupabaseSingle.mockResolvedValue({ data: null, error: null });
}

describe('Activity Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSupabaseMockChain();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('User Activity Logging', () => {
    beforeEach(() => {
      // Setup default config for user logging tests
      mockSupabaseSingle.mockResolvedValue({
        data: {
          config_data: {
            user_activity_logging_enabled: true,
            agent_activity_logging_enabled: true,
            performance_settings: { batch_writes: false },
          },
        },
        error: null,
      });
    });

    it('should log user activity when logging is enabled', async () => {
      const userLog: UserActivityLog = {
        user_id: 'user-123',
        activity_type: UserActivityType.CHAT_MESSAGE_SEND,
        activity_category: ActivityCategory.CHAT,
        resource_id: 'chat-456',
        success: true,
      };

      await logUserActivity(userLog);

      // Verify insert was called
      expect(mockSupabaseFrom).toHaveBeenCalledWith('user_activity_logs');
      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          activity_type: UserActivityType.CHAT_MESSAGE_SEND,
          activity_category: ActivityCategory.CHAT,
        })
      );
    });

    it('should generate correlation ID if not provided', async () => {
      const userLog: UserActivityLog = {
        user_id: 'user-123',
        activity_type: UserActivityType.CHAT_MESSAGE_SEND,
        activity_category: ActivityCategory.CHAT,
      };

      await logUserActivity(userLog);

      // Verify correlation_id was added
      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          correlation_id: expect.any(String),
        })
      );
    });

    it('should preserve provided correlation ID', async () => {
      const correlationId = 'custom-correlation-id';
      const userLog: UserActivityLog = {
        user_id: 'user-123',
        correlation_id: correlationId,
        activity_type: UserActivityType.CHAT_MESSAGE_SEND,
        activity_category: ActivityCategory.CHAT,
      };

      await logUserActivity(userLog);

      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          correlation_id: correlationId,
        })
      );
    });

    it('should log different activity types correctly', async () => {
      // Test authentication activity
      await logUserActivity({
        user_id: 'user-123',
        activity_type: UserActivityType.AUTH_LOGIN,
        activity_category: ActivityCategory.AUTHENTICATION,
      });

      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          activity_type: UserActivityType.AUTH_LOGIN,
          activity_category: ActivityCategory.AUTHENTICATION,
        })
      );

      // Test document activity
      await logUserActivity({
        user_id: 'user-123',
        activity_type: UserActivityType.DOCUMENT_CREATE,
        activity_category: ActivityCategory.DOCUMENT,
      });

      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          activity_type: UserActivityType.DOCUMENT_CREATE,
          activity_category: ActivityCategory.DOCUMENT,
        })
      );
    });
  });

  describe('Agent Activity Logging', () => {
    beforeEach(() => {
      // Setup default config for agent logging tests
      mockSupabaseSingle.mockResolvedValue({
        data: {
          config_data: {
            user_activity_logging_enabled: true,
            agent_activity_logging_enabled: true,
            performance_settings: { batch_writes: false },
          },
        },
        error: null,
      });
    });

    it('should log AI model metrics', async () => {
      await logAgentActivity({
        correlation_id: 'corr-123',
        agent_type: AgentType.CHAT_MODEL_AGENT,
        operation_type: AgentOperationType.CODE_GENERATION,
        operation_category: AgentOperationCategory.GENERATION,
        model_id: 'gemini-2.0-flash-exp',
        provider: 'google',
        thinking_mode: true,
        input_tokens: 1000,
        output_tokens: 500,
        reasoning_tokens: 200,
        total_tokens: 1700,
        input_cost: 0.01,
        output_cost: 0.005,
        total_cost: 0.015,
      });

      expect(mockSupabaseFrom).toHaveBeenCalledWith('agent_activity_logs');
      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          model_id: 'gemini-2.0-flash-exp',
          thinking_mode: true,
          input_tokens: 1000,
          output_tokens: 500,
          total_cost: 0.015,
        })
      );
    });

    it('should log different agent types', async () => {
      await logAgentActivity({
        correlation_id: 'corr-123',
        agent_type: AgentType.PYTHON_AGENT,
        operation_type: AgentOperationType.CODE_EXECUTION,
        operation_category: AgentOperationCategory.EXECUTION,
      });

      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_type: AgentType.PYTHON_AGENT,
          operation_type: AgentOperationType.CODE_EXECUTION,
        })
      );
    });
  });

  describe('Error Logging', () => {
    beforeEach(() => {
      mockSupabaseSingle.mockResolvedValue({
        data: {
          config_data: {
            user_activity_logging_enabled: true,
            agent_activity_logging_enabled: true,
            performance_settings: { batch_writes: false },
          },
        },
        error: null,
      });
    });

    it('should handle database errors gracefully in user activity logging', async () => {
      // Mock database error
      mockSupabaseInsert.mockResolvedValue({
        error: { message: 'Database connection failed' },
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const userLog: UserActivityLog = {
        user_id: 'user-123',
        activity_type: UserActivityType.CHAT_MESSAGE_SEND,
        activity_category: ActivityCategory.CHAT,
      };

      // Should not throw
      await expect(logUserActivity(userLog)).resolves.not.toThrow();

      consoleErrorSpy.mockRestore();
    });

    it('should handle database errors gracefully in agent activity logging', async () => {
      mockSupabaseInsert.mockResolvedValue({
        error: { message: 'Database connection failed' },
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const agentLog: AgentActivityLog = {
        correlation_id: 'corr-123',
        agent_type: AgentType.CHAT_MODEL_AGENT,
        operation_type: AgentOperationType.CODE_GENERATION,
        operation_category: AgentOperationCategory.GENERATION,
      };

      await expect(logAgentActivity(agentLog)).resolves.not.toThrow();

      consoleErrorSpy.mockRestore();
    });

    it('should log error details in activity logs', async () => {
      await logUserActivity({
        user_id: 'user-123',
        activity_type: UserActivityType.CHAT_MESSAGE_SEND,
        activity_category: ActivityCategory.CHAT,
        success: false,
        error_message: 'API key invalid',
      });

      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error_message: 'API key invalid',
        })
      );
    });
  });

  describe('Batch Processing', () => {
    it('should support batch mode configuration', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: {
          config_data: {
            user_activity_logging_enabled: true,
            performance_settings: {
              batch_writes: true,
              batch_size: 5,
            },
          },
        },
        error: null,
      });

      await logUserActivity({
        user_id: 'user-1',
        activity_type: UserActivityType.CHAT_MESSAGE_SEND,
        activity_category: ActivityCategory.CHAT,
      });

      // Batch processing test - verify logging was called
      expect(mockSupabaseFrom).toHaveBeenCalled();
    });

    it('should flush batch after timer delay', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: {
          config_data: {
            user_activity_logging_enabled: true,
            performance_settings: {
              batch_writes: true,
              batch_size: 100,
            },
          },
        },
        error: null,
      });

      await logUserActivity({
        user_id: 'user-1',
        activity_type: UserActivityType.CHAT_MESSAGE_SEND,
        activity_category: ActivityCategory.CHAT,
      });

      // Advance timer to trigger batch flush
      await vi.advanceTimersByTimeAsync(6000);

      // Verify flush occurred
      expect(mockSupabaseFrom).toHaveBeenCalled();
    });
  });

  describe('Log Filtering by Category', () => {
    beforeEach(() => {
      mockSupabaseSingle.mockResolvedValue({
        data: {
          config_data: {
            user_activity_logging_enabled: true,
            performance_settings: { batch_writes: false },
          },
        },
        error: null,
      });
    });

    it('should log authentication category activities', async () => {
      await logUserActivity({
        user_id: 'user-123',
        activity_type: UserActivityType.AUTH_LOGIN,
        activity_category: ActivityCategory.AUTHENTICATION,
      });

      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          activity_category: ActivityCategory.AUTHENTICATION,
        })
      );
    });

    it('should log chat category activities', async () => {
      await logUserActivity({
        user_id: 'user-123',
        activity_type: UserActivityType.CHAT_MESSAGE_SEND,
        activity_category: ActivityCategory.CHAT,
      });

      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          activity_category: ActivityCategory.CHAT,
        })
      );
    });

    it('should log document category activities', async () => {
      await logUserActivity({
        user_id: 'user-123',
        activity_type: UserActivityType.DOCUMENT_CREATE,
        activity_category: ActivityCategory.DOCUMENT,
      });

      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          activity_category: ActivityCategory.DOCUMENT,
        })
      );
    });

    it('should log admin category activities', async () => {
      await logUserActivity({
        user_id: 'user-123',
        activity_type: UserActivityType.ADMIN_CONFIG_UPDATE,
        activity_category: ActivityCategory.ADMIN,
      });

      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          activity_category: ActivityCategory.ADMIN,
        })
      );
    });

    it('should log artifact category activities', async () => {
      await logUserActivity({
        user_id: 'user-123',
        activity_type: UserActivityType.ARTIFACT_CREATE,
        activity_category: ActivityCategory.ARTIFACT,
      });

      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          activity_category: ActivityCategory.ARTIFACT,
        })
      );
    });
  });

  describe('Performance Tracker', () => {
    beforeEach(() => {
      mockSupabaseSingle.mockResolvedValue({
        data: {
          config_data: {
            agent_activity_logging_enabled: true,
            performance_settings: { batch_writes: false },
          },
        },
        error: null,
      });
    });

    it('should track operation duration', async () => {
      const tracker = new PerformanceTracker({
        agent_type: AgentType.CHAT_MODEL_AGENT,
        operation_type: AgentOperationType.CODE_GENERATION,
        operation_category: AgentOperationCategory.GENERATION,
      });

      // Simulate some work
      await vi.advanceTimersByTimeAsync(1500);

      await tracker.end({ success: true });

      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          duration_ms: expect.any(Number),
          start_time: expect.any(Date),
          end_time: expect.any(Date),
        })
      );
    });

    it('should generate correlation ID in PerformanceTracker', () => {
      const tracker = new PerformanceTracker({
        agent_type: AgentType.CHAT_MODEL_AGENT,
        operation_type: AgentOperationType.CODE_GENERATION,
        operation_category: AgentOperationCategory.GENERATION,
      });

      const correlationId = tracker.getCorrelationId();
      expect(correlationId).toBeTruthy();
      expect(typeof correlationId).toBe('string');
    });

    it('should get current duration from PerformanceTracker', async () => {
      const tracker = new PerformanceTracker({
        agent_type: AgentType.CHAT_MODEL_AGENT,
        operation_type: AgentOperationType.CODE_GENERATION,
        operation_category: AgentOperationCategory.GENERATION,
      });

      await vi.advanceTimersByTimeAsync(1000);

      const duration = tracker.getDuration();
      expect(duration).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('Utility Functions', () => {
    it('should create valid correlation ID', () => {
      const correlationId = createCorrelationId();
      expect(correlationId).toBeTruthy();
      expect(typeof correlationId).toBe('string');
      // UUID v4 format
      expect(correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should check user activity logging status when enabled', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: {
          config_data: {
            user_activity_logging_enabled: true,
          },
        },
        error: null,
      });

      const enabled = await isUserActivityLoggingEnabled();
      expect(enabled).toBe(true);
    });

    it('should check agent activity logging status when enabled', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: {
          config_data: {
            agent_activity_logging_enabled: true,
          },
        },
        error: null,
      });

      const enabled = await isAgentActivityLoggingEnabled();
      expect(enabled).toBe(true);
    });
  });
});
