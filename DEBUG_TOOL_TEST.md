# Debug Tool Integration Test

## What to Look For in Console Logs

When you test the prompt: **"What are the latest developments in artificial intelligence in 2025 aug ? Please search for recent news and updates."**

### Expected Debug Log Sequence:

1. **Chat Agent Initialization**:
   ```
   🤖 [DEBUG] GoogleChatAgent.chat() called with: {...}
   ```

2. **Provider Tools Config Loading**:
   ```
   🔧 [DEBUG] Loading provider tools config...
   🔧 [DEBUG] Provider tools config loaded: true
   🔧 [DEBUG] Config data: {...}
   ✅ [DEBUG] Provider tools config is enabled, creating agent
   ✅ [DEBUG] API key set for provider tools agent
   ```

3. **System Prompt Building**:
   ```
   🔧 [DEBUG] Built system prompt length: [number]
   🔧 [DEBUG] System prompt preview: [preview text]
   ```

4. **Tools Building**:
   ```
   🔧 [DEBUG] buildTools() called
   🔧 [DEBUG] Provider Tools Agent exists: true
   🔧 [DEBUG] Provider Tools Config: {...}
   🔧 [DEBUG] Chat Agent Config Tools: {...}
   ✅ [DEBUG] All conditions met - adding providerToolsAgent tool
   🔧 [DEBUG] buildTools() returning: ["providerToolsAgent"]
   ```

5. **Stream Configuration**:
   ```
   🔧 [DEBUG] Tools enabled: ["providerToolsAgent"]
   🚀 [DEBUG] Starting streamText...
   ```

6. **Tool Execution** (if working correctly):
   ```
   🚀 [DEBUG] providerToolsAgent.execute() called with: [search request]
   ```

## Troubleshooting

### If No Tools Are Built:
Look for this pattern:
```
❌ [DEBUG] Provider Tools Agent conditions not met:
  - providerToolsAgent exists: false/true
  - providerToolsConfig enabled: false/true  
  - config.tools.providerToolsAgent enabled: false/true
```

### If Tools Are Built But Not Called:
- Check if the system prompt includes tool instructions
- Verify the model is receiving the tools in the configuration
- Look for any AI SDK tool format issues

### If Provider Tools Config Not Loading:
```
❌ [DEBUG] Provider tools config not enabled or not found
```
- Verify database migration was applied
- Check that `provider_tools_agent_google` config exists in database
- Ensure `enabled: true` in the config

## Database Verification

Run this SQL to check your configuration:
```sql
SELECT config_key, config_data->'enabled' as enabled, config_data->'tools' as tools 
FROM admin_config 
WHERE config_key IN ('chat_model_agent_google', 'provider_tools_agent_google');
```

Expected results:
- `chat_model_agent_google`: `enabled: true`, `tools.providerToolsAgent.enabled: true`
- `provider_tools_agent_google`: `enabled: true`, all tool configs enabled

## Test Sequence

1. **Reset database** with updated migration
2. **Start the application**
3. **Send the test prompt**
4. **Check console logs** for the debug sequence above
5. **Verify tool is called** when asking for current information

If the tool is not being called, the issue is likely in:
1. Database configuration not loaded correctly
2. Tool building conditions not met
3. System prompt not instructing model to use tools
4. AI SDK tool format compatibility issues