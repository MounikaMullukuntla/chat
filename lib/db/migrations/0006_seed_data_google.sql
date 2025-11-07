-- =====================================================
-- Google Agent Configurations Seed Data
-- File: 0006_seed_data_google.sql
-- Description: Inserts Google provider agent configurations (Active by default)
-- =====================================================

-- Google agent configurations (Active by default)
INSERT INTO admin_config (config_key, config_data) VALUES
('chat_model_agent_google', '{
  "enabled": true,
  "systemPrompt": "You are a helpful AI assistant powered by Google Gemini. Be concise, accurate, and friendly. For current information, news, web analysis, or code execution, always use the available tools rather than relying on your training data.\n\nYou have access to the providerToolsAgent tool. Use it when users ask for:\n- Current information, news, or real-time data (use for web search)\n- Analysis of web pages or URLs (use for content analysis)\n- Code execution or calculations (use for running code)\n\nWhen you need external information or services, call the providerToolsAgent tool with a clear description of what you need.",
  "capabilities": {
    "fileInput": false
  },
  "fileInputTypes": {
    "codeFiles": {
      "py": { "enabled": false },
      "ipynb": { "enabled": false },
      "js": { "enabled": false },
      "jsx": { "enabled": false },
      "ts": { "enabled": false },
      "tsx": { "enabled": false },
      "html": { "enabled": false },
      "css": { "enabled": false },
      "json": { "enabled": false },
      "xml": { "enabled": false },
      "sql": { "enabled": false },
      "sh": { "enabled": false },
      "bat": { "enabled": false },
      "ps1": { "enabled": false }
    },
    "textFiles": {
      "txt": { "enabled": false },
      "md": { "enabled": false },
      "yaml": { "enabled": false },
      "yml": { "enabled": false },
      "toml": { "enabled": false },
      "ini": { "enabled": false },
      "cfg": { "enabled": false },
      "conf": { "enabled": false },
      "log": { "enabled": false },
      "csv": { "enabled": false }
    },
    "pdf": { "enabled": false },
    "ppt": { "enabled": false },
    "excel": { "enabled": false },
    "images": { "enabled": false }
  },
  "rateLimit": {
    "perMinute": 10,
    "perHour": 100,
    "perDay": 1000
  },
  "tools": {
    "providerToolsAgent": {
      "description": "Delegate to specialized agent for web search, URL analysis, and code execution tasks",
      "tool_input": {
        "parameter_name": "input",
        "parameter_description": "The request or query for external services"
      },
      "enabled": true
    },
    "documentAgent": {
      "description": "Delegate to specialized agent for creating and managing text documents, spreadsheets, and reports",
      "tool_input": {
        "parameter_name": "input",
        "parameter_description": "The request for document creation or modification"
      },
      "enabled": true
    },
    "pythonAgent": {
      "description": "Generate and execute Python code for data analysis and programming tasks",
      "enabled": false
    },
    "mermaidAgent": {
      "description": "Create and update diagrams, flowcharts, and visualizations",
      "enabled": false
    },
    "gitMcpAgent": {
      "description": "GitHub repository operations and version control tasks",
      "enabled": false
    }
  }
}'::jsonb),

('provider_tools_agent_google', '{
  "enabled": true,
  "systemPrompt": "You are a specialized agent for external services. Use Google Search for current information, analyze web content from URLs, and execute code safely. Provide accurate, well-structured responses.",
  "rateLimit": {
    "perMinute": 8,
    "perHour": 80,
    "perDay": 500
  },
  "tools": {
    "googleSearch": {
      "description": "Search the web for current information and real-time data",
      "enabled": true
    },
    "urlContext": {
      "description": "Fetch and analyze content from web pages and documents",
      "enabled": true
    },
    "codeExecution": {
      "description": "Execute Python code and return results with output",
      "enabled": true
    }
  }
}'::jsonb),

('document_agent_google', '{
  "enabled": true,
  "systemPrompt": "You are a specialized document creation and editing assistant. Focus on creating well-structured, clear, and professional documents. Follow best practices for formatting and organization.\n\nWhen creating documents:\n- Use proper markdown formatting for text documents\n- Structure content with clear headings and sections\n- Ensure content is accurate and well-organized\n\nWhen creating spreadsheets:\n- Use proper CSV format with headers\n- Organize data in logical columns and rows\n- Ensure data consistency and proper formatting\n\nWhen updating documents:\n- The user''s request will include context about which document to update\n- Look for document IDs mentioned in the conversation history or user''s request\n- If a document was recently created in the conversation, use that document''s ID\n- The document ID is provided in the input parameter when available",
  "rateLimit": {
    "perMinute": 5,
    "perHour": 50,
    "perDay": 200
  },
  "tools": {
    "createDocumentArtifact": {
      "description": "Create a new text document or report with markdown formatting",
      "tool_input": {
        "parameter_name": "title",
        "parameter_description": "The title of the document"
      },
      "enabled": true
    },
    "updateDocumentArtifact": {
      "description": "Update or edit an existing text document",
      "tool_input": {
        "parameter_name": "id",
        "parameter_description": "The ID of the document to update"
      },
      "enabled": true
    },
    "createSheetArtifact": {
      "description": "Create a new spreadsheet with CSV data",
      "tool_input": {
        "parameter_name": "title",
        "parameter_description": "The title of the spreadsheet"
      },
      "enabled": true
    },
    "updateSheetArtifact": {
      "description": "Update or edit an existing spreadsheet",
      "tool_input": {
        "parameter_name": "id",
        "parameter_description": "The ID of the spreadsheet to update"
      },
      "enabled": true
    }
  }
}'::jsonb),

('python_agent_google', '{
  "enabled": false,
  "systemPrompt": "You are a Python code generation specialist. Create clean, efficient, and well-documented Python code. Focus on best practices, error handling, and browser-executable code when requested.",
  "rateLimit": {
    "perMinute": 3,
    "perHour": 30,
    "perDay": 150
  },
  "tools": {
    "createCodeArtifact": {
      "description": "Create new Python code artifacts",
      "enabled": false
    },
    "updateCodeArtifact": {
      "description": "Edit and update existing Python code",
      "enabled": false
    }
  }
}'::jsonb),

('mermaid_agent_google', '{
  "enabled": false,
  "systemPrompt": "You are a Mermaid diagram specialist. Create clear, well-structured diagrams using proper Mermaid syntax. Focus on readability and accurate representation of concepts.",
  "rateLimit": {
    "perMinute": 3,
    "perHour": 25,
    "perDay": 100
  },
  "tools": {
    "createMermaidDiagrams": {
      "description": "Create new Mermaid diagrams and flowcharts",
      "enabled": false
    },
    "updateMermaidDiagrams": {
      "description": "Edit and update existing Mermaid diagrams",
      "enabled": false
    }
  }
}'::jsonb),

('git_mcp_agent_google', '{
  "enabled": false,
  "systemPrompt": "You are a Git and GitHub integration specialist. Help users manage repositories, create commits, and handle version control tasks. Always follow Git best practices and security guidelines.",
  "rateLimit": {
    "perMinute": 2,
    "perHour": 20,
    "perDay": 80
  },
  "tools": {}
}'::jsonb)

ON CONFLICT (config_key) DO NOTHING;