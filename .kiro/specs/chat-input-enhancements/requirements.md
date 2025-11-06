# Requirements Document

## Introduction

This feature enhances the user input functionality in the /chat page to provide a more comprehensive and flexible chat experience. The enhancement includes conditional file input capabilities, thinking mode toggle, nested model selection dropdown, and GitHub repository context integration.

## Glossary

- **Chat_Input_System**: The user interface component that handles input collection and configuration for chat interactions
- **File_Input_Component**: The interface element that allows users to attach files to their chat messages
- **Thinking_Mode_Toggle**: A UI control that enables/disables thinking mode for supported AI models
- **Model_Selector_Dropdown**: A nested dropdown interface showing providers at level 1 and their models at level 2
- **GitHub_Context_Integration**: A search and selection interface for adding GitHub repositories as context
- **Admin_Config**: The administrative configuration system that defines active providers and models
- **PAT**: Personal Access Token used for GitHub API authentication
- **Active_Provider**: A model provider that is currently enabled in the admin configuration
- **Active_Model**: An AI model that is currently enabled within an active provider

## Requirements

### Requirement 1

**User Story:** As a chat user, I want to attach files to my messages when the selected provider supports file input, so that I can provide additional context through documents and media.

#### Acceptance Criteria

1. WHEN a user selects a provider that supports file input, THE Chat_Input_System SHALL display the File_Input_Component
2. WHEN a user selects a provider that does not support file input, THE Chat_Input_System SHALL hide the File_Input_Component
3. THE File_Input_Component SHALL accept only file types that are allowed by the selected provider configuration
4. WHEN a user attempts to upload a disallowed file type, THE Chat_Input_System SHALL display an error message indicating the allowed file types.
5. We can ignore file storage for now.

### Requirement 2

**User Story:** As a chat user, I want to toggle thinking mode when available for my selected model, so that I can control whether the AI shows its reasoning process.

#### Acceptance Criteria

1. WHEN a user selects a model that supports thinking mode, THE Chat_Input_System SHALL display the Thinking_Mode_Toggle
2. WHEN a user selects a model that does not support thinking mode, THE Chat_Input_System SHALL hide the Thinking_Mode_Toggle
3. THE Thinking_Mode_Toggle SHALL maintain its state across model selections within the same session
4. WHEN thinking mode is enabled, THE Chat_Input_System SHALL include thinking mode parameters in the chat request

### Requirement 3

**User Story:** As a chat user, I want to select AI models through a nested dropdown interface, so that I can easily navigate between providers and their available models.

#### Acceptance Criteria

1. THE Model_Selector_Dropdown SHALL display active providers at the first level
2. WHEN a user selects a provider, THE Model_Selector_Dropdown SHALL display that provider's active chat models at the second level
3. THE Model_Selector_Dropdown SHALL fetch provider and chat model data from Admin_Config
4. THE Model_Selector_Dropdown SHALL only display providers that are marked as active in Admin_Config
5. THE Model_Selector_Dropdown SHALL only display models that are marked as active within their respective active providers
6. WHEN a provider is not configured or inactive, THE Model_Selector_Dropdown SHALL not display that provider in the first level
7. The User can select only chat model, other agent models are admin preset and user cannot modify

### Requirement 4

**User Story:** As a chat user, I want to search and add GitHub repositories as context, so that I can provide relevant code context for my conversations.

#### Acceptance Criteria

1. THE GitHub_Context_Integration SHALL provide a search interface for GitHub repositories
2. THE GitHub_Context_Integration SHALL use PAT for authentication to access both public and private repositories
3. THE GitHub_Context_Integration SHALL display search results in owner/repository format
4. THE GitHub_Context_Integration SHALL support multiselect functionality for adding multiple repositories
5. WHEN a user searches for repositories, THE GitHub_Context_Integration SHALL return both public and private repositories accessible with the provided PAT
6. THE GitHub_Context_Integration SHALL allow users to remove selected repositories from the context list

### Requirement 5

**User Story:** As a system administrator, I want the chat input enhancements related to file, Github to operate at the UI level only, so that the implementation remains lightweight and doesn't require backend storage changes. only model/provider and thinking mode shloud reflect what is configured in admin_config. Dont have to initalise models yet, just keep these setting at UI level and dont have to make actuall LLm calls.

#### Acceptance Criteria

1. THE Chat_Input_System SHALL store file attachments in browser memory during the session
2. THE Chat_Input_System SHALL not persist uploaded files to server storage
3. THE GitHub_Context_Integration SHALL fetch repository information dynamically without server-side caching
4. THE Model_Selector_Dropdown SHALL fetch configuration data from existing Admin_Config endpoints without requiring new storage schemas
5. The thinking mode fetch configuration data from existing Admin_Config endpoints without requiring new storage schemas