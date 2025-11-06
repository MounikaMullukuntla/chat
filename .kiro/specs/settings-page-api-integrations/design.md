# Design Document

## Overview

The Settings Page with API Integrations feature provides a comprehensive interface for users to manage AI provider API keys and external service integrations. The design follows the existing application's UI patterns using shadcn/ui components and maintains security by storing all sensitive data locally in browser storage.

## Architecture

### Component Hierarchy
```
SettingsPage
├── PageHeader
├── Tabs (API Keys, Integrations)
│   ├── APIKeysTab
│   │   ├── APIKeySection (Google)
│   │   ├── APIKeySection (Anthropic)
│   │   └── APIKeySection (OpenAI)
│   └── IntegrationsTab
│       └── GitHubIntegrationSection
└── SaveIndicator
```

### Data Flow
1. User interactions trigger state updates in React components
2. State changes are immediately persisted to localStorage
3. Verification actions call external APIs to validate credentials
4. UI reflects current state and verification status

## Components and Interfaces

### Core Components

#### SettingsPage
Main container component that manages the overall layout and tab navigation.

```typescript
interface SettingsPageProps {
  className?: string;
}
```

#### APIKeySection
Reusable component for managing individual API provider keys.

```typescript
interface APIKeySectionProps {
  provider: 'google' | 'anthropic' | 'openai';
  title: string;
  description: string;
  placeholder: string;
  onVerify: (key: string) => Promise<VerificationResult>;
}
```

#### GitHubIntegrationSection
Specialized component for GitHub PAT management.

```typescript
interface GitHubIntegrationSectionProps {
  onVerify: (token: string) => Promise<GitHubVerificationResult>;
}
```

### Storage Interface

#### LocalStorageManager
Utility class for managing browser storage operations.

```typescript
interface StorageManager {
  getAPIKey(provider: string): string | null;
  setAPIKey(provider: string, key: string): void;
  removeAPIKey(provider: string): void;
  getGitHubPAT(): string | null;
  setGitHubPAT(token: string): void;
  removeGitHubPAT(): void;
}
```

### Verification Services

#### APIKeyVerificationService
Service for validating API keys with minimal test calls.

```typescript
interface VerificationResult {
  success: boolean;
  error?: string;
  details?: {
    model?: string;
    usage?: object;
  };
}

interface APIKeyVerificationService {
  verifyGoogleKey(key: string): Promise<VerificationResult>;
  verifyAnthropicKey(key: string): Promise<VerificationResult>;
  verifyOpenAIKey(key: string): Promise<VerificationResult>;
}
```

#### GitHubVerificationService
Service for validating GitHub PATs and retrieving repository information.

```typescript
interface GitHubVerificationResult {
  success: boolean;
  error?: string;
  user?: {
    login: string;
    name: string;
  };
  repositories?: Array<{
    name: string;
    full_name: string;
    private: boolean;
  }>;
  scopes?: string[];
  expiresAt?: string;
}
```

## Data Models

### Storage Schema
```typescript
interface LocalStorageSchema {
  'api-keys': {
    google?: string;
    anthropic?: string;
    openai?: string;
  };
  'integrations': {
    github?: {
      token: string;
      lastVerified?: string;
      user?: {
        login: string;
        name: string;
      };
    };
  };
}
```

### Component State
```typescript
interface APIKeyState {
  value: string;
  isVerifying: boolean;
  verificationResult?: VerificationResult;
  showKey: boolean;
}

interface GitHubState {
  token: string;
  isVerifying: boolean;
  verificationResult?: GitHubVerificationResult;
  showToken: boolean;
}
```

## Error Handling

### API Key Verification Errors
- **Invalid Key Format**: Display format requirements
- **Authentication Failed**: Show clear error message
- **Rate Limited**: Display retry guidance with countdown
- **Network Error**: Provide retry option and offline indicator
- **Service Unavailable**: Show service status and alternative options

### GitHub PAT Verification Errors
- **Invalid Token**: Display token format requirements
- **Insufficient Permissions**: List required scopes
- **Token Expired**: Guide user to regenerate token
- **Repository Access**: Show accessible vs restricted repositories
- **API Rate Limit**: Display rate limit status and reset time

### Storage Errors
- **Storage Quota Exceeded**: Warn user and suggest cleanup
- **Storage Unavailable**: Fallback to session-only mode
- **Data Corruption**: Clear corrupted data and notify user

## Testing Strategy

### Unit Tests
- Storage manager operations (get, set, remove)
- Component state management
- Input validation and sanitization
- Error handling scenarios

### Integration Tests
- API key verification flows
- GitHub PAT validation
- Storage persistence across sessions
- Component interaction patterns

### End-to-End Tests
- Complete settings configuration workflow
- Verification success and failure scenarios
- Data persistence and retrieval
- Cross-browser compatibility

### Security Tests
- Verify no API keys are transmitted to server
- Validate secure storage practices
- Test input sanitization
- Confirm no sensitive data in logs

## UI/UX Design

### Layout Structure
- **Header**: Page title and description
- **Tabs**: Clean separation between API Keys and Integrations
- **Sections**: Card-based layout for each provider/service
- **Actions**: Consistent button placement and styling

### Visual Feedback
- **Loading States**: Spinners during verification
- **Success Indicators**: Green checkmarks and success messages
- **Error States**: Red indicators with helpful error messages
- **Empty States**: Guidance for first-time setup

### Accessibility
- **Keyboard Navigation**: Full tab support
- **Screen Readers**: Proper ARIA labels and descriptions
- **Color Contrast**: Meets WCAG guidelines
- **Focus Management**: Clear focus indicators

### Responsive Design
- **Mobile**: Stacked layout with full-width inputs
- **Tablet**: Two-column layout where appropriate
- **Desktop**: Optimal spacing and multi-column layout

## Security Considerations

### Data Protection
- All API keys stored only in browser localStorage
- No transmission of sensitive data to server
- Automatic cleanup on logout/session end
- Secure input handling to prevent XSS

### Verification Security
- Minimal API calls for verification
- No storage of verification responses
- Rate limiting protection
- Secure error message handling

### Browser Storage
- Encryption of sensitive data in storage
- Regular cleanup of expired tokens
- Secure key generation for storage encryption
- Protection against storage manipulation