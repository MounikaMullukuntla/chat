# Implementation Plan

- [x] 1. Database Migration and Schema Updates






  - update seed_data.sql to remove routing agent configurations from admin_config table, analyse other. sql file and make changes as needed
  - Do not create migration script for modification, just edit esiting .sql files, as db will be reset
  - Update seed data to include new agent configuration structure (Chat Model, Provider Tools, Document, Python, Mermaid, Git MCP agents)
  - Add placeholder system prompts, tool descriptions, and rate limits for all new agent types
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.1, 8.2, 8.3, 8.4_

- [x] 2. Update Database Query Functions





  - Modify admin configuration queries to handle new agent configuration keys
  - Remove routing agent related query functions as well API endpoints
  - Add validation functions for new agent configuration schemas
  - _Requirements: 8.1, 8.2, 9.2, 9.6_

- [x] 3. Create Base Agent Configuration Components





- [x] 3.1 Create shared AgentConfigForm component


  - Implement base form with agent enable/disable toggle, save/reset functionality, loading states
  - Add common form validation and error handling
  - _Requirements: 10.1, 10.3, 10.4_



- [x] 3.2 Create enhanced ModelSelector component





  - Build model selection interface with pricing display, enable/disable toggles, default selection
  - Add pricing per million tokens display for input/output


  - _Requirements: 2.3, 3.2, 4.2, 5.2, 6.2, 7.2, 10.5_

- [x] 3.3 Create CapabilitiesConfiguration component


  - Implement thinking/reasoning toggle and file input toggle (Chat Model only)
  - Add tool-specific capability controls
  - _Requirements: 2.4, 3.4, 4.3, 5.3, 6.3, 7.3_

- [x] 3.4 Create ToolsConfiguration component




  - Build tool enable/disable interface with descriptions
  - Add dependency warnings when tool agent is disabled
  - _Requirements: 2.6, 2.7, 3.6, 4.4, 5.4, 6.4, 7.4_

- [ ] 4. Implement Chat Model Agent Configuration





- [x] 4.1 Create ChatModelAgentConfig component


  - Build Chat Model Agent configuration form with all required fields
  - Implement agent enable/disable, system prompt editor, model selection
  - Add capabilities configuration (thinking/reasoning, file input)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4.2 Add Chat Model Agent tools configuration


  - Implement tools section showing Provider Tools, Document, Python, Mermaid, Git MCP agents
  - Add tool descriptions and enable/disable toggles with dependency warnings
  - _Requirements: 2.6, 2.7_

- [x] 5. Implement Provider Tools Agent Configuration





- [x] 5.1 Create ProviderToolsAgentConfig component


  - Build Provider Tools Agent configuration form with agent enable/disable
  - Add model selection, system prompt editor, capabilities configuration
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5.2 Add Provider Tools Agent tools configuration


  - Implement tools section for Google Search, URL Context, Code Execution
  - Add tool descriptions and enable/disable toggles
  - _Requirements: 3.6_
-

- [x] 6. Implement Document Agent Configuration




- [x] 6.1 Create DocumentAgentConfig component


  - Build Document Agent configuration form with agent enable/disable
  - Add model selection, system prompt editor, capabilities configuration
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 6.2 Add Document Agent tools configuration


  - Implement tools section for Create Document Artifact and Update Document Artifact
  - Add tool descriptions and enable/disable toggles
  - _Requirements: 4.4_
-

- [x] 7. Implement Python Agent Configuration




- [x] 7.1 Create PythonAgentConfig component


  - Build Python Agent configuration form with agent enable/disable
  - Add system prompt editor and capabilities configuration
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 7.2 Add Python Agent tools configuration







  - Implement tools section for Create Code Artifact and Update Code Artifact
  - Add tool descriptions and enable/disable toggles
  - _Requirements: 5.4_
-

- [x] 8. Implement Mermaid Agent Configuration




- [x] 8.1 Create MermaidAgentConfig component


  - Build Mermaid Agent configuration form with agent enable/disable
  - Add system prompt editor and capabilities configuration
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 8.2 Add Mermaid Agent tools configuration


  - Implement tools section for Create Mermaid Diagrams and Update Mermaid Diagrams
  - Add tool descriptions and enable/disable toggles
  - _Requirements: 6.4_
-

- [x] 9. Implement Git MCP Agent Configuration




- [x] 9.1 Create GitMCPAgentConfig component


  - Build Git MCP Agent configuration form with agent enable/disable
  - Add system prompt editor and capabilities configuration
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 9.2 Add Git MCP Agent tools placeholder


  - Implement empty tools section with placeholder for future tool configuration
  - _Requirements: 7.4_

- [x] 10. Update Admin Layout and Navigation





- [x] 10.1 Remove routing agent tab from AdminLayout


  - Remove routing agent tab and related navigation
  - Update tab structure to show new agent types
  - _Requirements: 1.1, 1.2, 10.1, 10.2_
-

- [x] 10.2 Add new agent tabs to AdminLayout






  - Add Chat Model, Provider Tools, Document, Python, Mermaid, Git MCP agent tabs
  - Wire up new configuration components to tabs
  - _Requirements: 10.1, 10.2_

- [x] 11. Update API Endpoints





- [x] 11.1 Remove routing agent API support


  - Remove API endpoints that handle routing agent configurations
  - Update API validation to reject routing agent config keys
  - _Requirements: 1.3, 9.1, 9.2, 9.3, 9.4_

- [x] 11.2 Add new agent configuration API endpoints


  - Implement CRUD operations for all new agent configuration types
  - Add validation for new configuration schemas
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 12. Remove Routing Agent Components and Code




- [x] 12.1 Delete routing agent configuration components


  - Remove RoutingAgentConfig component and related files
  - Remove routing rules configuration components
  - _Requirements: 1.1, 1.2_

- [x] 12.2 Clean up routing agent imports and references







  - Remove all imports and references to routing agent components
  - Update any remaining code that references routing agent functionality
  - _Requirements: 1.1, 1.2_

- [x] 13. Refactor Component Organization and File Structure


- [x] 13.1 Create agent-specific folder structure


  - Create components/admin/agents/ directory with subfolders for each agent type
  - Move existing agent configuration components to appropriate agent folders
  - Update all import references to reflect new file structure
  - _Requirements: 11.1, 11.2, 11.3, 11.4_


- [x] 13.2 Reorganize shared components
  - Move shared components (enhanced-model-selector, tools-configuration, etc.) to components/admin/shared/
  - Update import paths in all agent configuration components

  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 14. Implement Instant Configuration Updates




- [x] 14.1 Add PATCH API support for instant updates


  - Modify existing API endpoints to support PATCH operations for specific configuration fields
  - Add validation for partial configuration updates
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_



- [x] 14.2 Update model selector for instant updates














  - Modify enhanced-model-selector to trigger immediate PATCH calls on changes
  - Add visual feedback for successful/failed updates
  - Remove model configuration from main save operation


  - _Requirements: 12.1, 12.5_

- [x] 14.3 Update capabilities configuration for instant updates









  - Modify capabilities-configuration to trigger immediate PATCH calls on toggle changes


  - Add visual feedback for successful/failed updates
  - Remove capabilities from main save operation
  - _Requirements: 12.2, 12.5_

- [x] 14.4 Update tools configuration for instant updates




  - Modify tools-configuration to trigger immediate PATCH calls on tool enable/disable and description changes
  - Add inline editing for tool descriptions with auto-save
  - Remove tools configuration from main save operation
  - _Requirements: 12.3, 12.4, 12.5_

- [x] 15. Implement Selective Save Button Functionality







- [x] 15.1 Modify agent configuration forms for selective save




  - Update all agent configuration components to only include system prompt and rate limit in save operations
  - Add form state tracking to enable/disable save button based on unsaved changes
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 15.2 Update save button behavior and feedback




  - Modify save button to clearly indicate which fields will be updated
  - Add success/error messages specific to system prompt and rate limit updates
  - _Requirements: 13.3, 13.4, 13.5_

- [x] 16. Implement Enhanced File Input Configuration





- [x] 16.1 Create file type configuration component


  - Build new component for managing file input types with categories and individual toggles
  - Add support for Code Files (.py, .ipynb, .js, .jsx, .ts, .tsx), Text/YAML/Doc, PDF, PPT, Excel, Images
  - Implement collapsible categories with individual file type controls
  - _Requirements: 14.1, 14.2, 14.4_

- [x] 16.2 Integrate file type configuration with Chat Model Agent


  - Add file type configuration to Chat Model Agent capabilities section
  - Implement instant PATCH updates for file type enable/disable changes
  - Add validation to ensure file upload restrictions match enabled types
  - _Requirements: 14.2, 14.3, 14.5_

- [ ]* 17. Add Comprehensive Testing
- [ ]* 17.1 Write unit tests for new agent configuration components
  - Test agent enable/disable functionality, form validation, save operations
  - Test model selector, capabilities, and tools configuration
  - Test instant update functionality and selective save behavior
  - _Requirements: 10.3, 10.4, 10.5, 12.5, 13.5_

- [ ]* 17.2 Write API integration tests
  - Test CRUD operations for all agent configuration types
  - Test PATCH operations for instant updates
  - Test configuration validation and error handling
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 12.1, 12.2, 12.3, 12.4_

- [ ]* 17.3 Write end-to-end tests for admin interface
  - Test complete configuration workflows for each agent type
  - Test dependency warnings and validation scenarios
  - Test file type configuration and instant update workflows
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 14.1, 14.2, 14.3, 14.4, 14.5_