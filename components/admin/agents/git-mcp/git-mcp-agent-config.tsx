// 'use client'

// import { useState, useEffect } from 'react'
// import { AgentConfigForm } from '../../shared/agent-config-form'
// import { SystemPromptEditor } from '../../shared/system-prompt-editor'

// import { EnhancedRateLimitConfiguration } from '../../shared/enhanced-rate-limit-configuration'
// import { ToolsConfiguration } from '../../shared/tools-configuration'

// interface ToolConfig {
//   description: string
//   enabled: boolean
// }

// interface GitMCPAgentConfig {
//   enabled: boolean
//   systemPrompt: string
//   rateLimit: {
//     perMinute: number
//     perHour: number
//     perDay: number
//   }
//   tools: Record<string, ToolConfig>
// }

// interface GitMCPAgentConfigProps {
//   configKey: string
//   provider?: string
// }

// export function GitMCPAgentConfig({ configKey, provider = 'google' }: GitMCPAgentConfigProps) {
//   const [config, setConfig] = useState<GitMCPAgentConfig | null>(null)
//   const [loading, setLoading] = useState(true)
//   const [error, setError] = useState<string | null>(null)

//   // Load configuration from database
//   useEffect(() => {
//     const loadConfig = async () => {
//       try {
//         setLoading(true)
//         setError(null)

//         const configResponse = await fetch(`/api/admin/config/${configKey}`)
//         if (configResponse.ok) {
//           const data = await configResponse.json()
//           setConfig(data.configData)
//         } else {
//           throw new Error(`Failed to fetch configuration: ${configResponse.statusText}`)
//         }
//       } catch (err) {
//         console.error('Failed to load configuration:', err)
//         setError(err instanceof Error ? err.message : 'Failed to load configuration')
//       } finally {
//         setLoading(false)
//       }
//     }

//     loadConfig()
//   }, [configKey])

//   if (loading) {
//     return <div className="flex items-center justify-center p-8">Loading configuration...</div>
//   }

//   if (error) {
//     return <div className="flex items-center justify-center p-8 text-red-600">Error: {error}</div>
//   }

//   if (!config) {
//     return <div className="flex items-center justify-center p-8">No configuration found</div>
//   }

//   const handleConfigChange = (newConfig: any) => {
//     setConfig(prev => prev ? ({ ...prev, ...newConfig }) : null)
//   }

//   const handleSystemPromptChange = (systemPrompt: string) => {
//     setConfig(prev => prev ? ({ ...prev, systemPrompt }) : null)
//   }

//   const handleRateLimitChange = (rateLimitConfig: any) => {
//     const rateLimit = {
//       perMinute: 10,
//       perHour: rateLimitConfig.hourly?.value || 100,
//       perDay: rateLimitConfig.daily?.value || 1000
//     }
//     setConfig(prev => prev ? ({ ...prev, rateLimit }) : null)
//   }

//   const handleToolsChange = (tools: Record<string, ToolConfig>) => {
//     setConfig(prev => prev ? ({ ...prev, tools }) : null)
//   }

//   const enhancedRateLimit = {
//     hourly: {
//       type: 'hourly' as const,
//       value: config.rateLimit.perHour
//     },
//     daily: {
//       type: 'daily' as const,
//       value: config.rateLimit.perDay
//     }
//   }

//   return (
//     <AgentConfigForm
//       configKey={configKey}
//       title="Git MCP Agent"
//       description="Specialized agent for Git repository operations via Model Context Protocol"
//       value={config}
//       onChange={handleConfigChange}
//       className="space-y-6"
//       systemPromptSection={
//         <SystemPromptEditor
//           value={config.systemPrompt}
//           onChange={handleSystemPromptChange}
//           label="System Prompt"
//           description="Define how the Git MCP Agent should behave when handling Git operations"
//           placeholder="Enter the system prompt that defines how the agent should handle Git repository operations via MCP..."
//         />
//       }
//       rateLimitSection={
//         <EnhancedRateLimitConfiguration
//           value={enhancedRateLimit}
//           onChange={handleRateLimitChange}
//           label="Rate Limits"
//           description="Configure request limits for the Git MCP Agent"
//         />
//       }
//     >


//       <ToolsConfiguration
//         value={config.tools}
//         onChange={handleToolsChange}
//         label="Available Tools"
//         description="Git MCP tools will be configured here in future updates. This section is currently a placeholder for future tool configuration."
//         configKey={configKey}
//         enableInstantUpdates={true}
//       />
//     </AgentConfigForm>
//   )
// }