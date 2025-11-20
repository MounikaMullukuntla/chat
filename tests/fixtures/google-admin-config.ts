/**
 * Test fixtures for Google AI admin configurations
 * Based on actual seed data from 0006_seed_data_google.sql
 */

export const googleAdminConfig = {
  chatModelAgent: {
    config_key: "chat_model_agent_google",
    config_data: {
      enabled: true,
      capabilities: {
        fileInput: false,
      },
      rateLimit: {
        perMinute: 10,
        perHour: 100,
        perDay: 1000,
      },
      tools: {
        providerToolsAgent: {
          description:
            "Delegate to specialized agent for web search, URL analysis, and code execution tasks",
          enabled: true,
        },
        documentAgent: {
          description:
            "Create, update, revert, or add suggestions to text documents with real-time streaming",
          enabled: true,
        },
        pythonAgent: {
          description:
            "Create, update, fix, explain, or revert Python code with real-time streaming",
          enabled: true,
        },
        mermaidAgent: {
          description:
            "Create, update, fix, or revert Mermaid diagrams with real-time streaming",
          enabled: true,
        },
        gitMcpAgent: {
          description:
            "Delegate to specialized agent for ALL GitHub operations",
          enabled: true,
        },
      },
    },
  },
  providerToolsAgent: {
    config_key: "provider_tools_agent_google",
    config_data: {
      enabled: true,
      systemPrompt:
        "You are a specialized agent for external services. Use Google Search for current information, analyze web content from URLs, and execute code safely. Provide accurate, well-structured responses.",
      rateLimit: {
        perMinute: 8,
        perHour: 80,
        perDay: 500,
      },
      tools: {
        googleSearch: {
          description: "Search the web for current information and real-time data",
          enabled: true,
        },
        urlContext: {
          description: "Fetch and analyze content from web pages and documents",
          enabled: true,
        },
        codeExecution: {
          description: "Execute Python code and return results with output",
          enabled: true,
        },
      },
    },
  },
  documentAgent: {
    config_key: "document_agent_google",
    config_data: {
      enabled: true,
      rateLimit: {
        perMinute: 5,
        perHour: 50,
        perDay: 200,
      },
      tools: {
        create: { enabled: true },
        update: { enabled: true },
        suggestion: { enabled: true },
        revert: { enabled: true },
      },
    },
  },
  pythonAgent: {
    config_key: "python_agent_google",
    config_data: {
      enabled: true,
      rateLimit: {
        perMinute: 5,
        perHour: 50,
        perDay: 200,
      },
      tools: {
        create: { enabled: true },
        update: { enabled: true },
        fix: { enabled: true },
        explain: { enabled: true },
        generate: { enabled: true },
        revert: { enabled: true },
      },
    },
  },
  mermaidAgent: {
    config_key: "mermaid_agent_google",
    config_data: {
      enabled: true,
      rateLimit: {
        perMinute: 3,
        perHour: 25,
        perDay: 100,
      },
      tools: {
        create: { enabled: true },
        update: { enabled: true },
        fix: { enabled: true },
        generate: { enabled: true },
        revert: { enabled: true },
      },
    },
  },
  gitMcpAgent: {
    config_key: "git_mcp_agent_google",
    config_data: {
      enabled: true,
      rateLimit: {
        perMinute: 5,
        perHour: 50,
        perDay: 200,
      },
      tools: {
        repos: { enabled: true },
        issues: { enabled: true },
        pull_requests: { enabled: true },
        users: { enabled: true },
        code_search: { enabled: true },
        branches: { enabled: true },
      },
    },
  },
};

/**
 * App settings configuration
 */
export const appSettings = {
  config_key: "app_settings",
  config_data: {
    activeProvider: "google",
    availableProviders: ["google"],
  },
};

/**
 * Helper to get all Google agent configs
 */
export const getAllGoogleAgentConfigs = () => [
  googleAdminConfig.chatModelAgent,
  googleAdminConfig.providerToolsAgent,
  googleAdminConfig.documentAgent,
  googleAdminConfig.pythonAgent,
  googleAdminConfig.mermaidAgent,
  googleAdminConfig.gitMcpAgent,
];
