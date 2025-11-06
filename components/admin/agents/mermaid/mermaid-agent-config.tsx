// 'use client'

// import { useState, useEffect } from 'react'
// import { AgentConfigForm } from '../../shared/agent-config-form'
// import { SystemPromptEditor } from '../../shared/system-prompt-editor'
// import { EnhancedModelSelector } from '../../shared/enhanced-model-selector'

// import { EnhancedRateLimitConfiguration } from '../../shared/enhanced-rate-limit-configuration'
// import { ToolsConfiguration } from '../../shared/tools-configuration'

// interface ModelConfig {
//   id: string
//   name: string
//   description: string
//   pricingPerMillionTokens: {
//     input: number
//     output: number
//   }
//   enabled: boolean
//   isDefault: boolean
//   thinkingEnabled?: boolean
// }

// interface ToolConfig {
//   description: string
//   enabled: boolean
// }

// interface MermaidAgentConfig {
//   enabled: boolean
//   systemPrompt: string
//   availableModels: ModelConfig[]
//   rateLimit: {
//     perMinute: number
//     perHour: number
//     perDay: number
//   }
//   tools: {
//     createMermaidDiagrams: ToolConfig
//     updateMermaidDiagrams: ToolConfig
//   }
// }

// interface MermaidAgentConfigProps {
//   configKey: string
//   provider?: string
// }

// export function MermaidAgentConfig({ configKey, provider = 'google' }: MermaidAgentConfigProps) {
//   const [config, setConfig] = useState<MermaidAgentConfig | null>(null)
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

//   const handleModelsChange = (availableModels: ModelConfig[]) => {
//     setConfig(prev => prev ? ({ ...prev, availableModels }) : null)
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
//     setConfig(prev => {
//       if (!prev) return null
      
//       const typedTools = {
//         createMermaidDiagrams: tools.createMermaidDiagrams || prev.tools.createMermaidDiagrams,
//         updateMermaidDiagrams: tools.updateMermaidDiagrams || prev.tools.updateMermaidDiagrams
//       }
//       return { ...prev, tools: typedTools }
//     })
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
//       title="Mermaid Agent"
//       description="Specialized agent for diagram creation and visualization"
//       value={config}
//       onChange={handleConfigChange}
//       className="space-y-6"
//       systemPromptSection={
//         <SystemPromptEditor
//           value={config.systemPrompt}
//           onChange={handleSystemPromptChange}
//           label="System Prompt"
//           description="Define how the Mermaid Agent should behave when creating and updating diagrams"
//           placeholder="Enter the system prompt that defines how the agent should handle Mermaid diagram creation and management..."
//         />
//       }
//       rateLimitSection={
//         <EnhancedRateLimitConfiguration
//           value={enhancedRateLimit}
//           onChange={handleRateLimitChange}
//           label="Rate Limits"
//           description="Configure request limits for the Mermaid Agent"
//         />
//       }
//     >
//       <EnhancedModelSelector
//         onModelsChange={handleModelsChange}
//         provider={provider}
//         label="Available Models"
//         description="Configure which models are available for the Mermaid Agent with pricing information"
//         configKey={configKey}
//       />



//       <ToolsConfiguration
//         value={config.tools}
//         onChange={handleToolsChange}
//         label="Available Tools"
//         description="Configure which Mermaid diagram tools the Mermaid Agent can use"
//         configKey={configKey}
//         enableInstantUpdates={true}
//       />
//     </AgentConfigForm>
//   )
// }