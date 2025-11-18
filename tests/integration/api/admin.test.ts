/**
 * Admin API Integration Tests
 *
 * Tests all admin API endpoints including:
 * - GET /api/admin/config/:key
 * - PUT /api/admin/config/:key (create/update)
 * - PATCH /api/admin/config/:key (partial update)
 * - DELETE /api/admin/config/:key
 * - GET /api/admin/config/summary
 * - POST /api/admin/models (create model)
 * - PATCH /api/admin/models/:id (update model)
 * - Non-admin access (403)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Next.js modules
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Mock auth module
const mockRequireAdmin = vi.fn();
const mockCreateAuthErrorResponse = vi.fn();

vi.mock('@/lib/auth/server', () => ({
  requireAdmin: () => mockRequireAdmin(),
  createAuthErrorResponse: (error: Error) => mockCreateAuthErrorResponse(error),
}));

// Mock database queries
const mockGetAdminConfig = vi.fn();
const mockCreateAdminConfig = vi.fn();
const mockUpdateAdminConfig = vi.fn();
const mockPatchAdminConfig = vi.fn();
const mockDeleteAdminConfig = vi.fn();
const mockGetAdminConfigSummary = vi.fn();
const mockGetAllAgentConfigs = vi.fn();
const mockCreateModel = vi.fn();
const mockUpdateModel = vi.fn();
const mockDeleteModel = vi.fn();
const mockGetModelByModelId = vi.fn();
const mockGetAllModels = vi.fn();
const mockGetModelsByProvider = vi.fn();

vi.mock('@/lib/db/queries', () => ({
  getAdminConfig: (params: any) => mockGetAdminConfig(params),
  createAdminConfig: (params: any) => mockCreateAdminConfig(params),
  updateAdminConfig: (params: any) => mockUpdateAdminConfig(params),
}));

vi.mock('@/lib/db/queries/admin', () => ({
  patchAdminConfig: (params: any) => mockPatchAdminConfig(params),
  deleteAdminConfig: (params: any) => mockDeleteAdminConfig(params),
  getAdminConfigSummary: () => mockGetAdminConfigSummary(),
  getAllAgentConfigs: () => mockGetAllAgentConfigs(),
  isValidAgentConfigKey: (key: string) => {
    const validKeys = [
      'chat_model_agent_google',
      'provider_tools_agent_google',
      'document_agent_google',
      'python_agent_google',
      'mermaid_agent_google',
      'git_mcp_agent_google',
    ];
    return validKeys.includes(key);
  },
  validateAgentConfigData: (configKey: string, data: any) => {
    if (!data || typeof data !== 'object') {
      return { isValid: false, errors: ['Invalid config data'], warnings: [] };
    }
    return { isValid: true, errors: [], warnings: [] };
  },
  validatePartialAgentConfigData: (configKey: string, data: any) => {
    if (!data || typeof data !== 'object') {
      return { isValid: false, errors: ['Invalid partial config data'], warnings: [] };
    }
    return { isValid: true, errors: [], warnings: [] };
  },
}));

vi.mock('@/lib/db/queries/model-config', () => ({
  createModel: (params: any) => mockCreateModel(params),
  updateModel: (modelId: string, params: any) => mockUpdateModel(modelId, params),
  deleteModel: (modelId: string) => mockDeleteModel(modelId),
  getModelByModelId: (modelId: string) => mockGetModelByModelId(modelId),
  getAllModels: () => mockGetAllModels(),
  getModelsByProvider: (provider: string) => mockGetModelsByProvider(provider),
}));

// Mock logging
vi.mock('@/lib/errors/logger', () => ({
  logApiError: vi.fn(),
  logAdminError: vi.fn(),
  ErrorCategory: {
    INVALID_REQUEST: 'INVALID_REQUEST',
    UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
    API_REQUEST_FAILED: 'API_REQUEST_FAILED',
    DATABASE_ERROR: 'DATABASE_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    CONFIG_UPDATE_FAILED: 'CONFIG_UPDATE_FAILED',
  },
  ErrorSeverity: {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
  },
}));

vi.mock('@/lib/logging', () => ({
  logUserActivity: vi.fn(),
  createCorrelationId: () => 'test-correlation-id',
  UserActivityType: {
    ADMIN_DASHBOARD_VIEW: 'ADMIN_DASHBOARD_VIEW',
    ADMIN_CONFIG_UPDATE: 'ADMIN_CONFIG_UPDATE',
  },
  ActivityCategory: {
    ADMIN: 'ADMIN',
  },
}));

// Mock ChatSDKError
vi.mock('@/lib/errors', () => ({
  ChatSDKError: class ChatSDKError extends Error {
    constructor(public code: string, message?: string) {
      super(message);
    }
    toResponse(metadata?: any) {
      return Response.json(
        { error: this.code, message: this.message, metadata },
        { status: this.code.includes('not_found') ? 404 : this.code.includes('unauthorized') ? 401 : 400 }
      );
    }
  },
}));

// Test data
const mockAdminUser = {
  id: 'admin-user-id',
  email: 'admin@example.com',
  role: 'admin',
};

const mockNonAdminUser = {
  id: 'regular-user-id',
  email: 'user@example.com',
  role: 'user',
};

const mockConfig = {
  configKey: 'chat_model_agent_google',
  configData: {
    enabled: true,
    systemPrompt: 'You are a helpful AI assistant.',
    rateLimit: {
      hourly: 100,
      daily: 1000,
    },
  },
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedBy: mockAdminUser.id,
};

const mockModel = {
  id: 'model-id-123',
  modelId: 'gemini-2.0-flash-exp',
  name: 'Gemini 2.0 Flash',
  description: 'Latest Gemini model',
  provider: 'google',
  isActive: true,
  isDefault: true,
  thinkingEnabled: true,
  inputPricingPerMillionTokens: '0.075',
  outputPricingPerMillionTokens: '0.30',
  metadata: {},
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

describe('Admin API Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Default: admin user is authenticated
    mockRequireAdmin.mockResolvedValue({ user: mockAdminUser });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/config/:key', () => {
    it('should retrieve existing config', async () => {
      mockGetAdminConfig.mockResolvedValue(mockConfig);

      const { GET } = await import('@/app/api/admin/config/[configKey]/route');
      const request = new Request('http://localhost:3000/api/admin/config/chat_model_agent_google');
      const response = await GET(request, {
        params: Promise.resolve({ configKey: 'chat_model_agent_google' })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.configKey).toBe('chat_model_agent_google');
      expect(data.configData).toEqual(mockConfig.configData);
      expect(mockGetAdminConfig).toHaveBeenCalledWith({
        configKey: 'chat_model_agent_google'
      });
    });

    it('should return 404 if config not found', async () => {
      mockGetAdminConfig.mockResolvedValue(null);

      const { GET } = await import('@/app/api/admin/config/[configKey]/route');
      const request = new Request('http://localhost:3000/api/admin/config/chat_model_agent_google');
      const response = await GET(request, {
        params: Promise.resolve({ configKey: 'chat_model_agent_google' })
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('not_found:api');
    });

    it('should return 400 for invalid config key format', async () => {
      const { GET } = await import('@/app/api/admin/config/[configKey]/route');
      const request = new Request('http://localhost:3000/api/admin/config/invalid_key');
      const response = await GET(request, {
        params: Promise.resolve({ configKey: 'invalid_key' })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('bad_request:api');
    });

    it('should return 403 for non-admin users', async () => {
      const authError = new Error('Unauthorized');
      mockRequireAdmin.mockRejectedValue(authError);
      mockCreateAuthErrorResponse.mockReturnValue(
        Response.json({ error: 'unauthorized' }, { status: 403 })
      );

      const { GET } = await import('@/app/api/admin/config/[configKey]/route');
      const request = new Request('http://localhost:3000/api/admin/config/chat_model_agent_google');
      const response = await GET(request, {
        params: Promise.resolve({ configKey: 'chat_model_agent_google' })
      });

      expect(response.status).toBe(403);
      expect(mockCreateAuthErrorResponse).toHaveBeenCalledWith(authError);
    });
  });

  describe('PUT /api/admin/config/:key', () => {
    it('should create new config if not exists', async () => {
      mockGetAdminConfig.mockResolvedValue(null);
      mockCreateAdminConfig.mockResolvedValue(mockConfig);

      const { PUT } = await import('@/app/api/admin/config/[configKey]/route');
      const request = new Request('http://localhost:3000/api/admin/config/chat_model_agent_google', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockConfig.configData),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ configKey: 'chat_model_agent_google' })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.configKey).toBe('chat_model_agent_google');
      expect(mockCreateAdminConfig).toHaveBeenCalledWith({
        configKey: 'chat_model_agent_google',
        configData: mockConfig.configData,
        updatedBy: mockAdminUser.id,
      });
    });

    it('should update existing config', async () => {
      mockGetAdminConfig.mockResolvedValue(mockConfig);
      mockUpdateAdminConfig.mockResolvedValue({
        ...mockConfig,
        configData: { ...mockConfig.configData, enabled: false },
      });

      const { PUT } = await import('@/app/api/admin/config/[configKey]/route');
      const updatedData = { ...mockConfig.configData, enabled: false };
      const request = new Request('http://localhost:3000/api/admin/config/chat_model_agent_google', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ configKey: 'chat_model_agent_google' })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.configData.enabled).toBe(false);
      expect(mockUpdateAdminConfig).toHaveBeenCalledWith({
        configKey: 'chat_model_agent_google',
        configData: updatedData,
        updatedBy: mockAdminUser.id,
      });
    });

    it('should return 400 for invalid JSON', async () => {
      const { PUT } = await import('@/app/api/admin/config/[configKey]/route');
      const request = new Request('http://localhost:3000/api/admin/config/chat_model_agent_google', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await PUT(request, {
        params: Promise.resolve({ configKey: 'chat_model_agent_google' })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('bad_request:api');
    });
  });

  describe('PATCH /api/admin/config/:key', () => {
    it('should partially update existing config', async () => {
      mockGetAdminConfig.mockResolvedValue(mockConfig);
      mockPatchAdminConfig.mockResolvedValue({
        ...mockConfig,
        configData: {
          ...mockConfig.configData,
          rateLimit: { hourly: 200, daily: 2000 },
        },
      });

      const { PATCH } = await import('@/app/api/admin/config/[configKey]/route');
      const partialUpdate = { rateLimit: { hourly: 200, daily: 2000 } };
      const request = new Request('http://localhost:3000/api/admin/config/chat_model_agent_google', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partialUpdate),
      });

      const response = await PATCH(request, {
        params: Promise.resolve({ configKey: 'chat_model_agent_google' })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.configData.rateLimit.hourly).toBe(200);
      expect(mockPatchAdminConfig).toHaveBeenCalledWith({
        configKey: 'chat_model_agent_google',
        partialConfigData: partialUpdate,
        updatedBy: mockAdminUser.id,
      });
    });

    it('should return 404 if config not found', async () => {
      mockGetAdminConfig.mockResolvedValue(null);

      const { PATCH } = await import('@/app/api/admin/config/[configKey]/route');
      const request = new Request('http://localhost:3000/api/admin/config/chat_model_agent_google', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      });

      const response = await PATCH(request, {
        params: Promise.resolve({ configKey: 'chat_model_agent_google' })
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('not_found:api');
    });
  });

  describe('DELETE /api/admin/config/:key', () => {
    it('should delete existing config', async () => {
      // Reset and setup mocks for this specific test
      mockGetAdminConfig.mockReset();
      mockGetAdminConfig.mockResolvedValue(mockConfig);
      mockDeleteAdminConfig.mockResolvedValue(undefined);

      const { DELETE } = await import('@/app/api/admin/config/[configKey]/route');
      const request = new Request('http://localhost:3000/api/admin/config/chat_model_agent_google', {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ configKey: 'chat_model_agent_google' })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockDeleteAdminConfig).toHaveBeenCalledWith({
        configKey: 'chat_model_agent_google'
      });
    });

    it('should return 404 if config not found', async () => {
      // Reset and setup mocks for this specific test
      mockGetAdminConfig.mockReset();
      mockGetAdminConfig.mockResolvedValue(null);

      const { DELETE } = await import('@/app/api/admin/config/[configKey]/route');
      const request = new Request('http://localhost:3000/api/admin/config/chat_model_agent_google', {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ configKey: 'chat_model_agent_google' })
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('not_found:api');
    });
  });

  describe('GET /api/admin/config/summary', () => {
    it('should return comprehensive config summary', async () => {
      const mockConfigs = [
        {
          ...mockConfig,
          configKey: 'chat_model_agent_google',
          configData: { ...mockConfig.configData, enabled: true }
        },
        {
          ...mockConfig,
          configKey: 'provider_tools_agent_google',
          configData: { ...mockConfig.configData, enabled: true }
        },
      ];

      // Reset and setup mocks
      mockGetAllAgentConfigs.mockReset();
      mockGetAdminConfigSummary.mockReset();

      mockGetAllAgentConfigs.mockResolvedValue(mockConfigs);
      mockGetAdminConfigSummary.mockResolvedValue({
        providers: ['google'],
        agentTypes: ['chat_model_agent', 'provider_tools_agent'],
      });

      const { GET } = await import('@/app/api/admin/config/summary/route');
      const request = new Request('http://localhost:3000/api/admin/config/summary');

      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.overall).toBeDefined();
      expect(data.overall.totalConfigurations).toBe(2);
      expect(data.agentTypes).toBeDefined();
      expect(data.providers).toBeDefined();
    });
  });

  describe('POST /api/admin/models', () => {
    it('should create a new model', async () => {
      const newModelData = {
        modelId: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash',
        description: 'Latest Gemini model',
        provider: 'google' as const,
        isActive: true,
        isDefault: true,
        thinkingEnabled: true,
        inputPricingPerMillionTokens: '0.075',
        outputPricingPerMillionTokens: '0.30',
      };

      mockCreateModel.mockResolvedValue(mockModel);

      const { POST } = await import('@/app/api/admin/models/route');
      const request = new Request('http://localhost:3000/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newModelData),
      });

      const response = await POST(request as any);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.modelId).toBe('gemini-2.0-flash-exp');
      expect(mockCreateModel).toHaveBeenCalledWith(newModelData);
    });

    it('should return 400 for invalid model data', async () => {
      const { POST } = await import('@/app/api/admin/models/route');
      const request = new Request('http://localhost:3000/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: 'data' }),
      });

      const response = await POST(request as any);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('bad_request:api');
    });
  });

  describe('PATCH /api/admin/models/:id', () => {
    it('should update existing model', async () => {
      const updateData = {
        name: 'Gemini 2.0 Flash Updated',
        inputPricingPerMillionTokens: '0.10',
      };

      mockUpdateModel.mockResolvedValue({
        ...mockModel,
        ...updateData,
      });

      const { PATCH } = await import('@/app/api/admin/models/[modelId]/route');
      const request = new Request('http://localhost:3000/api/admin/models/gemini-2.0-flash-exp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request as any, {
        params: Promise.resolve({ modelId: 'gemini-2.0-flash-exp' }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe('Gemini 2.0 Flash Updated');
      expect(mockUpdateModel).toHaveBeenCalledWith('gemini-2.0-flash-exp', updateData);
    });
  });

  describe('Non-admin access tests', () => {
    it('should deny access to config endpoints for non-admin users', async () => {
      const authError = new Error('Forbidden: Admin access required');
      mockRequireAdmin.mockRejectedValue(authError);
      mockCreateAuthErrorResponse.mockReturnValue(
        Response.json({ error: 'forbidden' }, { status: 403 })
      );

      const { GET } = await import('@/app/api/admin/config/[configKey]/route');
      const request = new Request('http://localhost:3000/api/admin/config/chat_model_agent_google');

      const response = await GET(request, {
        params: Promise.resolve({ configKey: 'chat_model_agent_google' }),
      });

      expect(response.status).toBe(403);
      expect(mockRequireAdmin).toHaveBeenCalled();
    });

    it('should deny access to model endpoints for non-admin users', async () => {
      const authError = new Error('Forbidden: Admin access required');
      mockRequireAdmin.mockRejectedValue(authError);
      mockCreateAuthErrorResponse.mockReturnValue(
        Response.json({ error: 'forbidden' }, { status: 403 })
      );

      const { GET } = await import('@/app/api/admin/models/route');
      const request = new Request('http://localhost:3000/api/admin/models');

      const response = await GET(request as any);

      expect(response.status).toBe(403);
      expect(mockRequireAdmin).toHaveBeenCalled();
    });
  });
});
