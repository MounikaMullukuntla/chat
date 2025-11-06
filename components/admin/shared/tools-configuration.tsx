'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Wrench, AlertTriangle, CheckCircle, XCircle, Loader2, Edit, Check, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export interface ToolConfig {
  description: string
  enabled: boolean
  agentEnabled?: boolean
  tool_input?: {
    parameter_name: string
    parameter_description: string
  }
}

// Utility function to format tool names for display
function formatToolName(toolKey: string): string {
  return toolKey
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
}

interface ToolsConfigurationProps {
  value: Record<string, ToolConfig>
  onChange: (tools: Record<string, ToolConfig>) => void
  label?: string
  description?: string
  className?: string
  configKey?: string
  enableInstantUpdates?: boolean
}

export function ToolsConfiguration({
  value,
  onChange,
  label = "Available Tools",
  description = "Configure which tools this agent can use.",
  className = "",
  configKey,
  enableInstantUpdates = false
}: ToolsConfigurationProps) {
  const [updating, setUpdating] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [editingDescription, setEditingDescription] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState<string>('')
  const [editingParameterDescription, setEditingParameterDescription] = useState<string | null>(null)
  const [editingParameterValue, setEditingParameterValue] = useState<string>('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const parameterInputRef = useRef<HTMLTextAreaElement>(null)
  const handleToolUpdate = async (toolKey: string, updates: Partial<ToolConfig>) => {
    const newTools = {
      ...value,
      [toolKey]: {
        ...value[toolKey],
        ...updates
      }
    }

    // Always update local state first
    onChange(newTools)

    // If instant updates are enabled and we have a config key, make PATCH call
    if (enableInstantUpdates && configKey) {
      setUpdating(toolKey)
      setUpdateStatus(null)

      try {
        const response = await fetch(`/api/admin/config/${configKey}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tools: newTools
          }),
        })

        if (response.ok) {
          const updatedConfig = await response.json()
          onChange(updatedConfig.configData.tools)
          setUpdateStatus({ type: 'success', message: 'Tool updated successfully' })
        } else {
          // Revert optimistic update on failure
          onChange(value)
          const errorText = await response.text()
          setUpdateStatus({ type: 'error', message: `Failed to update tool: ${errorText}` })
        }
      } catch (error) {
        // Revert optimistic update on failure
        onChange(value)
        setUpdateStatus({ type: 'error', message: `Failed to update tool: ${error instanceof Error ? error.message : 'Unknown error'}` })
      } finally {
        setUpdating(null)
        // Clear status after 3 seconds
        setTimeout(() => setUpdateStatus(null), 3000)
      }
    }
  }

  const handleToolToggle = (toolKey: string, enabled: boolean) => {
    handleToolUpdate(toolKey, { enabled })
  }

  const handleDescriptionEdit = (toolKey: string) => {
    setEditingDescription(toolKey)
    setEditingValue(value[toolKey].description)
  }

  const handleDescriptionSave = async (toolKey: string) => {
    if (editingValue.trim() !== value[toolKey].description) {
      await handleToolUpdate(toolKey, { description: editingValue.trim() })
    }
    setEditingDescription(null)
    setEditingValue('')
  }

  const handleDescriptionCancel = () => {
    setEditingDescription(null)
    setEditingValue('')
  }

  const handleParameterDescriptionEdit = (toolKey: string) => {
    setEditingParameterDescription(toolKey)
    setEditingParameterValue(value[toolKey].tool_input?.parameter_description || '')
  }

  const handleParameterDescriptionSave = async (toolKey: string) => {
    const currentParameterDescription = value[toolKey].tool_input?.parameter_description || ''
    if (editingParameterValue.trim() !== currentParameterDescription) {
      const updatedToolInput = {
        parameter_name: value[toolKey].tool_input?.parameter_name || 'input',
        parameter_description: editingParameterValue.trim()
      }
      await handleToolUpdate(toolKey, { tool_input: updatedToolInput })
    }
    setEditingParameterDescription(null)
    setEditingParameterValue('')
  }

  const handleParameterDescriptionCancel = () => {
    setEditingParameterDescription(null)
    setEditingParameterValue('')
  }

  // Focus input when editing starts
  useEffect(() => {
    if (editingDescription && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingDescription])

  useEffect(() => {
    if (editingParameterDescription && parameterInputRef.current) {
      parameterInputRef.current.focus()
      parameterInputRef.current.select()
    }
  }, [editingParameterDescription])

  const toolEntries = Object.entries(value)
  const hasDisabledAgentWarnings = toolEntries.some(([_, tool]) => 
    tool.enabled && tool.agentEnabled === false
  )

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          {label}
        </CardTitle>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Update Status Alert */}
        {updateStatus && (
          <Alert className={updateStatus.type === 'success' ? 'border-green-200 bg-green-50 dark:bg-green-950' : 'border-red-200 bg-red-50 dark:bg-red-950'}>
            <div className="flex items-center gap-2">
              {updateStatus.type === 'success' ? (
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
              <AlertDescription className={updateStatus.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
                {updateStatus.message}
              </AlertDescription>
            </div>
          </Alert>
        )}
        {/* Dependency Warning */}
        {hasDisabledAgentWarnings && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Some enabled tools depend on agents that are currently disabled. 
              These tools may not function properly until their corresponding agents are enabled.
            </AlertDescription>
          </Alert>
        )}

        {/* Tools List */}
        <div className="space-y-4">
          {toolEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No tools configured for this agent.
            </div>
          ) : (
            toolEntries.map(([toolKey, tool]) => {
              const isAgentDisabled = tool.agentEnabled === false
              const showWarning = tool.enabled && isAgentDisabled
              const isEditing = editingDescription === toolKey
              const isUpdating = updating === toolKey
              
              return (
                <div key={toolKey} className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5 flex-1">
                      <Label 
                        htmlFor={`tool-${toolKey}`} 
                        className="text-base font-medium"
                      >
                        {formatToolName(toolKey)}
                      </Label>
                      
                      {/* Description with inline editing */}
                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea
                            ref={inputRef}
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.ctrlKey) {
                                handleDescriptionSave(toolKey)
                              } else if (e.key === 'Escape') {
                                handleDescriptionCancel()
                              }
                            }}
                            className="text-sm min-h-[60px]"
                            disabled={isUpdating}
                            rows={2}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDescriptionSave(toolKey)}
                              disabled={isUpdating}
                              className="h-8 w-8 p-0"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleDescriptionCancel}
                              disabled={isUpdating}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <span className="text-xs text-gray-500">Ctrl+Enter to save</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 group">
                          <p className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                            {tool.description}
                          </p>
                          {enableInstantUpdates && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDescriptionEdit(toolKey)}
                              className="h-6 w-6 p-0 shrink-0 border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
                              disabled={isUpdating}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Parameter Description with inline editing */}
                      {tool.tool_input && (
                        <div className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Input Parameter: {tool.tool_input.parameter_name}
                          </div>
                          {editingParameterDescription === toolKey ? (
                            <div className="space-y-2">
                              <Textarea
                                ref={parameterInputRef}
                                value={editingParameterValue}
                                onChange={(e) => setEditingParameterValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.ctrlKey) {
                                    handleParameterDescriptionSave(toolKey)
                                  } else if (e.key === 'Escape') {
                                    handleParameterDescriptionCancel()
                                  }
                                }}
                                className="text-xs min-h-[40px]"
                                disabled={isUpdating}
                                rows={1}
                                placeholder="Parameter description..."
                              />
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleParameterDescriptionSave(toolKey)}
                                  disabled={isUpdating}
                                  className="h-6 w-6 p-0"
                                >
                                  <Check className="h-2 w-2" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleParameterDescriptionCancel}
                                  disabled={isUpdating}
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="h-2 w-2" />
                                </Button>
                                <span className="text-xs text-gray-500">Ctrl+Enter to save</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2 group">
                              <p className="text-xs text-gray-500 dark:text-gray-400 flex-1">
                                {tool.tool_input.parameter_description || 'No parameter description'}
                              </p>
                              {enableInstantUpdates && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleParameterDescriptionEdit(toolKey)}
                                  className="h-5 w-5 p-0 shrink-0 border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
                                  disabled={isUpdating}
                                >
                                  <Edit className="h-2 w-2" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {showWarning && (
                        <div className="flex items-center gap-1 text-sm text-yellow-600 dark:text-yellow-400">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Dependent agent is disabled</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`tool-${toolKey}`}
                        checked={tool.enabled}
                        onCheckedChange={(enabled) => handleToolToggle(toolKey, enabled)}
                        disabled={isUpdating}
                      />
                      {isUpdating && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                  </div>
                  
                  {toolKey !== toolEntries[toolEntries.length - 1][0] && (
                    <div className="border-b border-gray-200 dark:border-gray-700" />
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          Tools marked with warnings depend on other agents being enabled to function properly.
        </div>
      </CardContent>
    </Card>
  )
}