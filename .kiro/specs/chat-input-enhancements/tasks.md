# Implementation Plan

- [x] 1. Extend admin configuration structure for model capabilities





  - Create TypeScript interfaces for model capabilities and provider configurations
  - Add fields for thinking mode support, file input enablement, and allowed file types
  - Update admin config queries to include new capability fields
  - _Requirements: 3.3, 3.4, 3.5, 3.6_

- [x] 2. Create ConditionalFileInput component





  - [x] 2.1 Implement file input visibility logic based on provider configuration


    - Create component that wraps existing AttachmentsButton
    - Add logic to show/hide based on selected provider's file input capability
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Add file type validation against provider configuration


    - Implement client-side file type checking against allowed types
    - Display appropriate error messages for invalid file types
    - _Requirements: 1.3, 1.4_


- [x] 3. Implement ThinkingModeToggle component



  - [x] 3.1 Create thinking mode toggle UI component


    - Build toggle switch component with proper styling
    - Add conditional rendering based on model thinking mode support
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Integrate thinking mode state management


    - Add thinking mode state to MultimodalInput component
    - Implement state persistence across model selections
    - Include thinking mode parameters in chat requests when enabled
    - _Requirements: 2.3, 2.4_

- [x] 4. Build NestedModelSelector component





  - [x] 4.1 Create two-level dropdown structure


    - Implement provider selection at first level
    - Create model selection dropdown for chosen provider
    - _Requirements: 3.1, 3.2_

  - [x] 4.2 Integrate with admin configuration API


    - Fetch provider and model data from admin config endpoints
    - Filter to show only active providers and models
    - Handle configuration loading and error states
    - _Requirements: 3.3, 3.4, 3.5, 3.6_

- [x] 5. Develop GitHub context integration





  - [x] 5.1 Create GitHub repository search component


    - Build search input with debounced API calls
    - Implement GitHub API integration using PAT authentication
    - Display search results in owner/repository format
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 5.2 Implement repository multiselect functionality


    - Add checkbox-based multiselect for repositories
    - Create selected repositories display with remove capability
    - Handle both public and private repository access
    - _Requirements: 4.4, 4.5, 4.6_

- [x] 6. Update MultimodalInput component integration





  - [x] 6.1 Integrate all new components into MultimodalInput


    - Replace existing ModelSelectorCompact with NestedModelSelector
    - Add ConditionalFileInput and ThinkingModeToggle components
    - Integrate GitHubContextIntegration component
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

  - [x] 6.2 Implement state management for enhanced features


    - Add state for thinking mode, selected repositories, and provider configurations
    - Ensure UI-level storage without backend persistence
    - Handle state updates and component re-rendering
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 7. Add comprehensive error handling
  - Implement error boundaries for new components
  - Add fallback UI states for configuration loading failures
  - Create user-friendly error messages for GitHub API issues
  - _Requirements: 1.4, 4.2_

- [ ]* 8. Write unit tests for new components
  - Test ConditionalFileInput visibility and validation logic
  - Test ThinkingModeToggle conditional rendering and state management
  - Test NestedModelSelector configuration integration
  - Test GitHubContextIntegration search and selection functionality
  - _Requirements: All requirements_