# API Migration Guide

## Overview
This guide covers the migration from legacy admin configuration APIs to the new streamlined model management system.

## Deprecated Endpoints

### 1. Legacy Model Management
- **Deprecated**: `/api/admin/config/[configKey]/models`
- **Replacement**: `/api/admin/models`
- **Migration Timeline**: 6 months (deprecation warnings active)

#### Before (Legacy)
```typescript
// Get models for an agent
GET /api/admin/config/chat_model_agent_google/models

// Update models for an agent
PUT /api/admin/config/chat_model_agent_google/models
```

#### After (New)
```typescript
// Get models by provider
GET /api/admin/models?provider=google

// Update individual model
PATCH /api/admin/models/gemini-1.5-pro

// Create new model
POST /api/admin/models

// Delete model
DELETE /api/admin/models/gemini-1.5-pro

// Set default model
POST /api/admin/models/gemini-1.5-pro/set-default
```

### 2. Consolidated Summary Endpoints
- **Removed**: `/api/admin/config/stats`
- **Removed**: `/api/admin/config/capabilities`
- **Replacement**: `/api/admin/config/summary` (now includes all functionality)

#### Before (Multiple Endpoints)
```typescript
// Get provider stats
GET /api/admin/config/stats

// Get capabilities
GET /api/admin/config/capabilities

// Get summary
GET /api/admin/config/summary
```

#### After (Single Endpoint)
```typescript
// Get comprehensive summary (includes stats and capabilities)
GET /api/admin/config/summary

// Response now includes:
{
  agentTypes: [...],
  providers: [...],
  overall: {...},
  stats: {...},        // Previously from /stats
  capabilities: {...}  // Previously from /capabilities
}
```

## Component Updates

### Shared Types
All model-related interfaces have been moved to `types/admin.ts`:

```typescript
import type { ModelConfig } from '@/types/admin'
```

### Removed Props
- `configKey` prop removed from `EnhancedModelSelector`
- `title` prop removed from `ModelConfigModal`

## Breaking Changes

1. **Model Management**: All model operations now use dedicated model endpoints
2. **Response Format**: Legacy model endpoints return different data structure
3. **Authentication**: All endpoints require admin authentication
4. **Error Handling**: New error response format with detailed error categories

## Migration Checklist

- [ ] Update frontend components to use new model APIs
- [ ] Remove references to deprecated endpoints
- [ ] Update error handling for new response formats
- [ ] Test all model CRUD operations
- [ ] Update documentation and API references
- [ ] Monitor deprecation warnings in logs

## Support

For migration assistance, please:
1. Check the deprecation warnings in your application logs
2. Review the new API documentation
3. Test the new endpoints in your development environment
4. Contact the development team for complex migration scenarios