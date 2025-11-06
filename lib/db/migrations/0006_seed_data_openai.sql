-- =====================================================
-- OpenAI Agent Configurations Seed Data
-- File: 0006_seed_data_openai.sql
-- Description: Inserts OpenAI provider agent configurations (Inactive by default)
-- =====================================================

-- OpenAI agent configurations (Inactive by default)
INSERT INTO admin_config (config_key, config_data) VALUES
('chat_model_agent_openai', '{
  "enabled": false,
  "systemPrompt": "You are a helpful AI assistant powered by OpenAI GPT. Be concise, accurate, and friendly. Delegate tasks to specialized agents when appropriate.",
  "capabilities": {
    "fileInput": true
  },
  "fileInputTypes": {
    "codeFiles": {
      "py": { "enabled": true },
      "ipynb": { "enabled": true },
      "js": { "enabled": true },
      "jsx": { "enabled": true },
      "ts": { "enabled": true },
      "tsx": { "enabled": true },
      "html": { "enabled": true },
      "css": { "enabled": true },
      "json": { "enabled": true },
      "xml": { "enabled": true },
      "sql": { "enabled": true },
      "sh": { "enabled": true },
      "bat": { "enabled": true },
      "ps1": { "enabled": true }
    },
    "textFiles": {
      "txt": { "enabled": true },
      "md": { "enabled": true },
      "yaml": { "enabled": true },
      "yml": { "enabled": true },
      "toml": { "enabled": true },
      "ini": { "enabled": true },
      "cfg": { "enabled": true },
      "conf": { "enabled": true },
      "log": { "enabled": true },
      "csv": { "enabled": true }
    },
    "pdf": { "enabled": true },
    "ppt": { "enabled": true },
    "excel": { "enabled": true },
    "images": { "enabled": true }
  },
  "rateLimit": {
    "perMinute": 5,
    "perHour": 50,
    "perDay": 200
  },
  "tools": {
    "providerToolsAgent": {
      "description": "Access to external APIs and services (Google Search, URL Context, Code Execution)",
      "enabled": true
    },
    "documentAgent": {
      "description": "Create and update text documents and reports",
      "enabled": true
    },
    "pythonAgent": {
      "description": "Generate and execute Python code for data analysis and programming tasks",
      "enabled": true
    },
    "mermaidAgent": {
      "description": "Create and update diagrams, flowcharts, and visualizations",
      "enabled": true
    },
    "gitMcpAgent": {
      "description": "GitHub repository operations and version control tasks",
      "enabled": true
    }
  }
}'::jsonb),

('provider_tools_agent_openai', '{
  "enabled": false,
  "systemPrompt": "You are a specialized agent for external API integrations. Provide accurate information from Google Search, analyze web content, and execute code when needed.",
  "rateLimit": {
    "perMinute": 4,
    "perHour": 40,
    "perDay": 150
  },
  "tools": {
    "googleSearch": {
      "description": "Search the web using Google Search API",
      "enabled": true
    },
    "urlContext": {
      "description": "Fetch and analyze content from web URLs",
      "enabled": true
    },
    "codeExecution": {
      "description": "Execute code in a secure sandbox environment",
      "enabled": true
    }
  }
}'::jsonb),

('document_agent_openai', '{
  "enabled": false,
  "systemPrompt": "You are a specialized document creation and editing assistant. Focus on creating well-structured, clear, and professional documents. Follow best practices for formatting and organization.",
  "rateLimit": {
    "perMinute": 3,
    "perHour": 30,
    "perDay": 100
  },
  "tools": {
    "createDocumentArtifact": {
      "description": "Create new text documents and reports",
      "enabled": true
    },
    "updateDocumentArtifact": {
      "description": "Edit and update existing documents",
      "enabled": true
    }
  }
}'::jsonb),

('python_agent_openai', '{
  "enabled": false,
  "systemPrompt": "You are a Python code generation specialist. Create clean, efficient, and well-documented Python code. Focus on best practices, error handling, and browser-executable code when requested.",
  "rateLimit": {
    "perMinute": 2,
    "perHour": 20,
    "perDay": 80
  },
  "tools": {
    "createCodeArtifact": {
      "description": "Create new Python code artifacts",
      "enabled": true
    },
    "updateCodeArtifact": {
      "description": "Edit and update existing Python code",
      "enabled": true
    }
  }
}'::jsonb),

('mermaid_agent_openai', '{
  "enabled": false,
  "systemPrompt": "You are a Mermaid diagram specialist. Create clear, well-structured diagrams using proper Mermaid syntax. Focus on readability and accurate representation of concepts.",
  "rateLimit": {
    "perMinute": 2,
    "perHour": 15,
    "perDay": 60
  },
  "tools": {
    "createMermaidDiagrams": {
      "description": "Create new Mermaid diagrams and flowcharts",
      "enabled": true
    },
    "updateMermaidDiagrams": {
      "description": "Edit and update existing Mermaid diagrams",
      "enabled": true
    }
  }
}'::jsonb),

('git_mcp_agent_openai', '{
  "enabled": false,
  "systemPrompt": "You are a Git and GitHub integration specialist. Help users manage repositories, create commits, and handle version control tasks. Always follow Git best practices and security guidelines.",
  "rateLimit": {
    "perMinute": 1,
    "perHour": 10,
    "perDay": 40
  },
  "tools": {}
}'::jsonb)

ON CONFLICT (config_key) DO NOTHING;