# Implementation Plan

- [-] 1. Update database schema and migration files



  - Update existing migration files for enhanced Document table with version control
  - Add new indexes for version queries and chat-specific artifacts
  - Reset database and verify schema changes
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 11.1, 11.2, 11.3, 11.4, 11.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 47-120_


- [x] 1.1 Update Document table schema in migration file

  - Modify `lib/db/migrations/0001_tables.sql` to include new columns: chat_id, parent_version_id, version_number, metadata
  - Update kind field to VARCHAR(20) with new enum values: 'text', 'python code', 'mermaid code', 'sheet'
  - Add foreign key constraints and table comments
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 121-150_

- [x] 1.2 Add version control indexes


  - Update `lib/db/migrations/0003_indexes.sql` with new indexes: idx_document_versions, idx_document_chat, idx_document_parent, idx_document_kind
  - Ensure optimal query performance for version history and chat-specific artifacts
  - _Requirements: 7.2, 7.3_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 151-170_

- [x] 1.3 Update database query functions


  - Modify `lib/db/queries.ts` to add saveDocument function with version control parameters
  - Add getDocumentVersions function for version history retrieval
  - Update existing document queries to handle new schema
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 171-230_

- [x] 1.4 Reset and verify database


  - Update, Verification script.
  - Run `npm run db:reset` to apply schema changes
  - Execute `npm run db:migrate` and `npm run db:verify`

  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 231-250_

- [x] 2. Implement Chat Model Agent with streamObject





  - Rewrite chat route to use streamObject for structured decision-making
  - Implement file processing and context extraction
  - Add thinking mode support and tool delegation logic
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 8.1, 8.2, 8.3, 8.4, 8.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 251-450_

- [x] 2.1 Update chat route with streamObject implementation


  - Replace existing streamText with streamObject in `app/(chat)/api/chat/route.ts`
  - Add tool definitions for all specialized agents: respondDirectly, documentAgent, pythonCodeAgent, mermaidCodeAgent, providerToolsAgent
  - Implement structured decision-making logic
  - _Requirements: 1.1, 1.2, 1.3, 10.1, 10.2, 10.3, 10.4, 10.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 251-400_

- [x] 2.2 Implement file processing system


  - Add extractFileContent function to handle multiple file types: text, JSON, code, images, PDF
  - Process file attachments and create File_Context strings
  - Handle file processing errors gracefully
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 401-450_

- [x] 2.3 Add thinking mode configuration


  - Implement thinkingEnabled parameter in chat route
  - Configure Google provider options with thinkingConfig
  - Add thinking budget and includeThoughts settings
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 280-300_

- [x] 3. Implement Document Agent





  - Create GoogleDocumentAgent class for text documents and spreadsheets
  - Support both content generation and injection modes
  - Implement line-range updates and version control
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 451-750_

- [x] 3.1 Create Document Agent class structure


  - Implement GoogleDocumentAgent in `lib/ai/providers/google/document-agent.ts`
  - Add constructor with configuration validation
  - Implement getModel and validateConfig methods
  - _Requirements: 3.1, 3.2_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 451-500_



- [x] 3.2 Implement document creation methods

  - Add createDocument method for generating new text documents and sheets
  - Implement injectDocument method for pre-generated content
  - Handle streaming with appropriate delta types: data-textDelta, data-sheetDelta
  - _Requirements: 3.1, 3.2, 3.5_


  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 501-650_

- [x] 3.3 Implement document update functionality


  - Add updateDocument method with line-range support
  - Handle both generated and pre-generated content updates
  - Implement version control with parent-child relationships
  - _Requirements: 3.3, 3.4, 7.1, 7.2, 7.3, 7.4_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 651-750_

- [x] 4. Implement Python Agent





  - Create GooglePythonAgent class for Python code artifacts
  - Use streamObject with code schema validation
  - Support line-range updates and code injection
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 751-850_

- [x] 4.1 Create Python Agent class structure


  - Implement GooglePythonAgent in `lib/ai/providers/google/python-agent.ts`
  - Use similar structure to DocumentAgent but with code-specific handling
  - Configure streamObject with code schema: z.object({ code: z.string() })
  - _Requirements: 4.1, 4.4_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 751-800_

- [x] 4.2 Implement code creation and injection methods


  - Add createCode method for generating Python code artifacts
  - Implement injectCode method for pre-written code
  - Stream data-codeDelta for real-time code display
  - _Requirements: 4.1, 4.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 801-830_

- [x] 4.3 Implement code update functionality


  - Add updateCode method with line-range support for targeted edits
  - Handle both generated and pre-generated code updates
  - Save artifacts with 'python code' kind and appropriate metadata
  - _Requirements: 4.2, 4.3_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 831-850_

- [x] 5. Implement Mermaid Agent





  - Create GoogleMermaidAgent class for Mermaid diagrams
  - Support multiple diagram types with syntax validation
  - Implement line-range updates for diagram modifications
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 851-950_

- [x] 5.1 Create Mermaid Agent class structure


  - Implement GoogleMermaidAgent in `lib/ai/providers/google/mermaid-agent.ts`
  - Use same structure as Python Agent but with Mermaid-specific prompts
  - Configure for 'mermaid code' kind with diagram validation
  - _Requirements: 5.1, 5.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 851-900_

- [x] 5.2 Implement diagram creation methods

  - Add createDiagram method for generating Mermaid diagrams
  - Implement injectDiagram method for pre-generated diagrams
  - Support flowcharts, sequence diagrams, class diagrams, and other types
  - _Requirements: 5.1, 5.2_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 901-930_

- [x] 5.3 Implement diagram update functionality

  - Add updateDiagram method with line-range support
  - Validate Mermaid syntax before artifact creation
  - Handle targeted diagram modifications
  - _Requirements: 5.3, 5.4, 5.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 931-950_

- [x] 6. Implement Provider Tools Agent





  - Create GoogleProviderToolsAgent for external services
  - Implement Google Search and code execution tools
  - Return results without creating artifacts
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 951-1050_

- [x] 6.1 Create Provider Tools Agent class


  - Implement GoogleProviderToolsAgent in `lib/ai/providers/google/provider-tools-agent.ts`
  - Configure for external service integration
  - Add validation for tool availability
  - _Requirements: 6.1, 6.2_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 951-980_

- [x] 6.2 Implement Google Search functionality

  - Add search method using google.tools.googleSearch
  - Stream search results and sources to data stream
  - Return structured results to Chat Model Agent
  - _Requirements: 6.1, 6.3_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 981-1010_

- [x] 6.3 Implement code execution for output

  - Add executeCode method using google.tools.codeExecution
  - Execute code for immediate output without artifact creation
  - Handle execution results and errors appropriately
  - _Requirements: 6.2, 6.4, 6.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 1011-1050_

- [x] 7. Create configuration loader and prompts





  - Implement agent configuration loading from database
  - Add Mermaid-specific prompts and update existing prompts
  - Create chat agent system prompt with tool descriptions
  - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 1051-1200_

- [x] 7.1 Implement configuration loader


  - Create loadGoogleAgentConfigs function in `lib/ai/config-loader.ts`
  - Load all agent configurations from admin_config table
  - Return structured configuration object for all agents
  - _Requirements: 1.1_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 1051-1100_

- [x] 7.2 Add Mermaid prompts


  - Add mermaidPrompt and updateMermaidPrompt to `lib/ai/prompts.ts`
  - Include diagram type guidance and syntax validation instructions
  - Support multiple Mermaid diagram types with examples
  - _Requirements: 5.1, 5.2, 5.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 1101-1150_

- [x] 7.3 Update chat agent system prompt


  - Add chatAgentSystemPrompt with tool descriptions and decision logic
  - Include guidance for content generation vs injection modes
  - Document line-range update capabilities
  - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 1151-1200_

- [ ] 8. Implement client-side Mermaid support





  - Create Mermaid artifact client and viewer component
  - Add Mermaid diagram rendering with error handling
  - Update artifact definitions to include Mermaid type
  - _Requirements: 5.1, 5.2, 12.1, 12.2, 12.3, 12.4, 12.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 1201-1400_

- [x] 8.1 Create Mermaid artifact client


  - Implement mermaidArtifact in `artifacts/mermaid/client.tsx`
  - Add artifact actions: copy, undo, redo with version navigation
  - Handle data-codeDelta streaming for real-time updates
  - _Requirements: 12.3, 12.4, 12.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 1201-1300_

- [x] 8.2 Create Mermaid viewer component


  - Implement MermaidViewer in `components/mermaid-viewer.tsx`
  - Add Mermaid initialization and diagram rendering
  - Handle rendering errors with user-friendly messages
  - _Requirements: 12.2_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 1301-1350_

- [x] 8.3 Update artifact definitions


  - Add mermaidArtifact to artifactDefinitions in `components/artifact.tsx`
  - Ensure proper artifact type registration for client rendering
  - _Requirements: 12.1_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 1351-1370_

- [x] 9. Add thinking mode UI toggle





  - Implement thinking mode toggle in multimodal input component
  - Add state management and persistence within chat session
  - Pass thinking mode setting to chat route
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 1371-1450_

- [x] 9.1 Add thinking mode toggle component

  - Update `components/multimodal-input.tsx` with Switch component for thinking mode
  - Add state management with useState for thinkingEnabled
  - Include Label component for accessibility
  - _Requirements: 8.1, 8.4_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 1371-1400_


- [ ] 9.2 Integrate thinking mode with message sending
  - Pass thinkingEnabled parameter to sendMessage function
  - Ensure thinking mode setting is included in chat requests
  - Handle thinking mode persistence within chat session
  - _Requirements: 8.2, 8.3, 8.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 1401-1450_

- [ ] 10. Implement error handling and testing
  - Add fail-fast error handling without retry logic
  - Create unit tests for all agent classes
  - Implement integration tests for multi-agent workflows
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 1451-1600_

- [ ] 10.1 Implement error handling strategy
  - Add error logging and stream writing in all agent methods
  - Implement fail-fast approach without automatic retries
  - Create structured error responses for client handling
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 1451-1500_

- [ ]* 10.2 Create unit tests for agents
  - Add test files for GoogleDocumentAgent, GooglePythonAgent, GoogleMermaidAgent, GoogleProviderToolsAgent
  - Test agent initialization, content generation, and error scenarios
  - Mock external dependencies and validate agent behavior
  - _Requirements: 9.1, 9.2, 9.3_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 1501-1550_

- [ ]* 10.3 Implement integration tests
  - Create end-to-end workflow tests for multi-agent coordination
  - Test file upload processing and context extraction
  - Validate version control and artifact management
  - _Requirements: 9.1, 9.2, 9.3_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 1551-1600_

- [ ] 11. Setup deployment and feature flags
  - Configure feature flag for gradual rollout
  - Setup database migration procedures
  - Create deployment verification checklist
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 1601-1700_

- [ ] 11.1 Configure feature flag implementation
  - Add ENABLE_MULTI_AGENT_GOOGLE environment variable
  - Update chat route to conditionally use new implementation
  - Setup gradual rollout mechanism with percentage-based enabling
  - _Requirements: 1.1_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 1601-1650_

- [ ] 11.2 Create deployment procedures
  - Document database reset and migration steps
  - Create pre-deployment verification checklist
  - Setup monitoring and rollback procedures
  - _Requirements: 1.2, 1.3, 1.4, 1.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 1651-1700_

- [ ] 12. Final integration and verification
  - Test complete multi-agent workflow end-to-end
  - Verify all artifact types work correctly
  - Validate version control and file processing
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5, 12.1, 12.2, 12.3, 12.4, 12.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 1701-1788_

- [ ] 12.1 Conduct end-to-end testing
  - Test complete user workflows from input to artifact creation
  - Verify agent delegation and coordination works correctly
  - Validate thinking mode toggle and file processing
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.1, 8.2, 8.3, 8.4, 8.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 1701-1750_

- [ ] 12.2 Verify artifact functionality
  - Test all artifact types: text, python code, mermaid code, sheet
  - Validate version control and history navigation
  - Confirm line-range updates work correctly
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4, 7.5_
  - _Reference: MULTI_AGENT_GOOGLE_IMPLEMENTATION_PLAN_FINAL.md lines 1751-1788_