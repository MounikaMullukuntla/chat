# Test Prompts for Refactored Chat Agent Architecture

## Overview
These prompts are designed to test the refactored architecture where:
- **Chat Agent** is the main orchestrator that users interact with
- **Provider Tools Agent** is a standalone agent that only Chat Agent can call
- The 3 external tools (Google Search, URL Context, Code Execution) are within Provider Tools Agent

## Test Prompts

### Prompt 1: Direct Response from Chat Agent
**Purpose**: Verify Chat Agent can respond directly without delegating to Provider Tools Agent

```
Hello! Can you explain what you are and what you can help me with? Please keep it brief.
```

**Expected Behavior**: 
- Chat Agent responds directly
- No tool calls to Provider Tools Agent
- Simple conversational response about capabilities

---

### Prompt 2: Google Search Tool Test
**Purpose**: Verify Chat Agent can delegate to Provider Tools Agent for web search

```
What are the latest developments in artificial intelligence in 2024? Please search for recent news and updates.
```

**Expected Behavior**:
- Chat Agent recognizes need for current information
- Calls Provider Tools Agent with search request
- Provider Tools Agent uses Google Search tool
- Returns current AI developments from web search

---

### Prompt 3: URL Context Tool Test
**Purpose**: Verify Chat Agent can delegate to Provider Tools Agent for URL analysis

```
Can you analyze the content of this webpage and summarize the key points: https://www.example.com/article
```

**Expected Behavior**:
- Chat Agent recognizes need to fetch web content
- Calls Provider Tools Agent with URL analysis request
- Provider Tools Agent uses URL Context tool
- Returns summary of webpage content

---

### Prompt 4: Code Execution Tool Test
**Purpose**: Verify Chat Agent can delegate to Provider Tools Agent for code execution

```
Can you calculate the factorial of 10 using Python code? Please write and execute the code to show the result.
```

**Expected Behavior**:
- Chat Agent recognizes need for code execution
- Calls Provider Tools Agent with code execution request
- Provider Tools Agent uses Code Execution tool
- Returns Python code and execution result showing factorial of 10 (3,628,800)

---

## Verification Checklist

For each prompt, verify:

### Chat Agent Behavior:
- [ ] Receives user input correctly
- [ ] Makes appropriate decision to delegate or respond directly
- [ ] Calls Provider Tools Agent when external services are needed
- [ ] Integrates Provider Tools Agent response into final answer

### Provider Tools Agent Behavior:
- [ ] Receives input from Chat Agent only (not directly from user)
- [ ] Uses appropriate tool (Google Search, URL Context, or Code Execution)
- [ ] Returns structured response to Chat Agent
- [ ] Handles errors gracefully

### System Integration:
- [ ] No direct user access to Provider Tools Agent
- [ ] Proper tool delegation flow
- [ ] Reasoning/thinking mode shows tool usage
- [ ] Final response integrates tool results naturally

## Expected Architecture Flow

```
User Input → Chat Agent → Decision Logic
                ↓
            [Direct Response] OR [Delegate to Provider Tools Agent]
                                            ↓
                                    Provider Tools Agent
                                            ↓
                                    [Google Search] OR [URL Context] OR [Code Execution]
                                            ↓
                                    Tool Result → Provider Tools Agent
                                            ↓
                                    Response → Chat Agent
                                            ↓
                                    Final Response → User
```

## Success Criteria

1. **Prompt 1**: Chat Agent responds directly without tool calls
2. **Prompt 2**: Full delegation chain works for Google Search
3. **Prompt 3**: Full delegation chain works for URL Context
4. **Prompt 4**: Full delegation chain works for Code Execution

All prompts should demonstrate clean separation between Chat Agent (user interface) and Provider Tools Agent (external services).