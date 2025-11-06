# Design Document

## Overview

The chat input enhancements will extend the existing `MultimodalInput` component to provide conditional file input, thinking mode toggle, nested model selection, and GitHub context integration. The design maintains the current architecture while adding new UI components and configuration-driven features.

## Architecture

### Component Structure
```
MultimodalInput (Enhanced)
├── FileInputComponent (Conditional)
├── ThinkingModeToggle (Conditional) 
├── NestedModelSelector (Replaces ModelSelectorCompact)
├── GitHubContextIntegration (New)
└── Existing Components (PromptInput, etc.)
```

### Data Flow
1. **Configuration Fetching**: Admin config data flows from database → API → UI components
2. **Model Selection**: Provider selection → Model selection → Feature availability updates
3. **File Handling**: File selection → Validation → Memory storage → Chat submission
4. **GitHub Integration**: PAT authentication → Repository search → Context selection

## Components and Interfaces

### 1. Enhanced MultimodalInput Component

**Props Interface:**
```typescript
interface EnhancedMultimodalInputProps extends MultimodalInputProps {
  adminConfig?: AdminConfigSummary;
  githubPAT?: string;
  onGitHubContextChange?: (repos: GitHubRepo[]) => void;
}
```

**State Management:**
- Extends existing state with thinking mode, selected repositories, and provider configurations
- Uses React state for UI-level data (no persistence required)

### 2. ConditionalFileInput Component

**Purpose:** Shows/hides file input based on selected provider's file support capability

**Interface:**
```typescript
interface ConditionalFileInputProps {
  selectedProvider: string;
  selectedModel: string;
  adminConfig: AdminConfigSummary;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  status: UseChatHelpers["status"];
}
```

**Logic:**
- Checks `adminConfig.providers[selectedProvider].fileInputEnabled`
- Validates file types against `adminConfig.providers[selectedProvider].allowedFileTypes`
- Renders existing AttachmentsButton conditionally

### 3. ThinkingModeToggle Component

**Purpose:** Provides toggle for thinking mode when supported by selected model

**Interface:**
```typescript
interface ThinkingModeToggleProps {
  selectedModel: string;
  adminConfig: AdminConfigSummary;
  thinkingMode: boolean;
  onThinkingModeChange: (enabled: boolean) => void;
}
```

**Logic:**
- Checks `adminConfig.models[selectedModel].supportsThinkingMode`
- Maintains toggle state in parent component
- Renders as switch/toggle button

### 4. NestedModelSelector Component

**Purpose:** Replaces ModelSelectorCompact with two-level dropdown (Provider → Model)

**Interface:**
```typescript
interface NestedModelSelectorProps {
  selectedProvider: string;
  selectedModel: string;
  adminConfig: AdminConfigSummary;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
}

interface AdminConfigSummary {
  providers: {
    [key: string]: {
      enabled: boolean;
      models: {
        [key: string]: {
          enabled: boolean;
          name: string;
          description: string;
          supportsThinkingMode: boolean;
          fileInputEnabled: boolean;
          allowedFileTypes: string[];
        }
      }
    }
  }
}
```

**UI Structure:**
```
┌─ Provider Dropdown ─────────┐
│ ○ Google                    │
│ ○ OpenAI                    │  
│ ○ Anthropic                 │
└─────────────────────────────┘
         ↓ (on selection)
┌─ Model Dropdown ────────────┐
│ ○ GPT-4 Vision              │
│ ○ GPT-4 Reasoning           │
│ ○ GPT-3.5 Turbo             │
└─────────────────────────────┘
```

### 5. GitHubContextIntegration Component

**Purpose:** Search and select GitHub repositories for context

**Interface:**
```typescript
interface GitHubContextIntegrationProps {
  githubPAT: string;
  selectedRepos: GitHubRepo[];
  onRepoSelectionChange: (repos: GitHubRepo[]) => void;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  private: boolean;
  description: string;
}
```

**Features:**
- Search input with debounced API calls
- Repository list with owner/repo format
- Multi-select with checkboxes
- Selected repositories display with remove option

## Data Models

### AdminConfig Extension
The existing admin config will be extended to include model and provider capabilities:

```typescript
interface ModelCapabilities {
  supportsThinkingMode: boolean;
  fileInputEnabled: boolean;
  allowedFileTypes: string[];
}

interface ProviderConfig {
  enabled: boolean;
  models: Record<string, ModelCapabilities>;
}

interface ExtendedAdminConfig {
  providers: Record<string, ProviderConfig>;
}
```

### GitHub Integration Data
```typescript
interface GitHubSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepo[];
}

interface GitHubContextState {
  searchQuery: string;
  searchResults: GitHubRepo[];
  selectedRepos: GitHubRepo[];
  isLoading: boolean;
  error: string | null;
}
```

## Error Handling

### File Input Validation
- **Invalid file type**: Show toast with allowed types
- **File too large**: Show size limit error
- **Upload failure**: Retry mechanism with user feedback

### GitHub Integration
- **Invalid PAT**: Clear error message with setup instructions
- **API rate limiting**: Show rate limit status and retry timing
- **Network errors**: Retry with exponential backoff
- **No repositories found**: Empty state with helpful message

### Configuration Loading
- **Missing admin config**: Fallback to default model list
- **Malformed config**: Log error, use safe defaults
- **API unavailable**: Show offline mode indicator

## Testing Strategy

### Unit Tests
- Component rendering based on configuration
- Conditional logic for file input and thinking mode
- GitHub API integration mocking
- Error state handling

### Integration Tests
- Full user flow: provider selection → model selection → feature availability
- File upload with different providers
- GitHub repository search and selection
- Configuration changes affecting UI state

### User Acceptance Tests
- Verify file input appears/disappears correctly
- Confirm thinking mode toggle functionality
- Test nested dropdown navigation
- Validate GitHub context integration workflow

## Implementation Notes

### Performance Considerations
- Debounce GitHub API calls (300ms)
- Memoize configuration parsing
- Lazy load GitHub integration component
- Cache repository search results per session

### Accessibility
- Proper ARIA labels for all new controls
- Keyboard navigation for nested dropdowns
- Screen reader announcements for state changes
- Focus management for modal interactions

### Browser Compatibility
- File API support (modern browsers)
- GitHub API CORS handling
- Local storage for temporary state
- Progressive enhancement for older browsers

### Security
- Validate file types on both client and server
- Sanitize GitHub API responses
- Secure PAT storage (not in localStorage)
- Rate limiting for API calls