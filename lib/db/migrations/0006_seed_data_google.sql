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
      "description": "Create and update text documents and reports",
      "enabled": false
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
  "enabled": false,
  "systemPrompt": "You are a specialized document creation and editing assistant. Focus on creating well-structured, clear, and professional documents. Follow best practices for formatting and organization.",
  "rateLimit": {
    "perMinute": 5,
    "perHour": 50,
    "perDay": 200
  },
  "tools": {
    "createDocumentArtifact": {
      "description": "Create new text documents and reports",
      "enabled": false
    },
    "updateDocumentArtifact": {
      "description": "Edit and update existing documents",
      "enabled": false
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