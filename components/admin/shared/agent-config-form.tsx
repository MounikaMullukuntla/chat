'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Loader2, Save, RotateCcw, AlertCircle, CheckCircle, Power } from 'lucide-react'
import { toast } from '@/components/toast'

interface BaseAgentConfig {
  enabled: boolean
  systemPrompt: string
  capabilities?: {
    thinkingReasoning: boolean
    fileInput?: boolean
  }
  rateLimit?: {
    perMinute: number
    perHour: number
    perDay: number
  }
}

interface AgentConfigFormProps {
  configKey: string
  title: string
  description?: string
  children: React.ReactNode
  systemPromptSection?: React.ReactNode
  rateLimitSection?: React.ReactNode
  value: BaseAgentConfig
  onChange: (value: BaseAgentConfig) => void
  onSave?: (value: BaseAgentConfig) => Promise<void>
  onReset?: () => void
  className?: string
  showAgentToggle?: boolean
}

export function AgentConfigForm({
  configKey,
  title,
  description,
  children,
  systemPromptSection,
  rateLimitSection,
  value,
  onChange,
  onSave,
  onReset,
  className = "",
  showAgentToggle = true
}: AgentConfigFormProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalValue, setOriginalValue] = useState<BaseAgentConfig | null>(null)

  // Load initial configuration
  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/admin/config/${configKey}`)
        
        if (response.ok) {
          const data = await response.json()
          // Merge loaded data with current value to ensure all required fields exist
          const mergedConfig = { ...value, ...data.configData }
          onChange(mergedConfig)
          setOriginalValue(mergedConfig)
        } else if (response.status === 404) {
          // Config doesn't exist yet, use default values
          setOriginalValue(value)
        } else {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to load configuration')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load configuration')
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [configKey])

  // Track changes (only for systemPrompt and rateLimit since other fields are saved instantly)
  useEffect(() => {
    if (originalValue) {
      const currentSaveableFields = {
        systemPrompt: value.systemPrompt,
        rateLimit: value.rateLimit
      }
      const originalSaveableFields = {
        systemPrompt: originalValue.systemPrompt,
        rateLimit: originalValue.rateLimit
      }
      setHasChanges(JSON.stringify(currentSaveableFields) !== JSON.stringify(originalSaveableFields))
    }
  }, [value, originalValue])

  const handleSave = async () => {
    if (!onSave) return

    setSaving(true)
    setError(null)

    try {
      // Only save systemPrompt and rateLimit - other fields are handled by instant updates
      const saveableFields = {
        systemPrompt: value.systemPrompt,
        rateLimit: value.rateLimit
      }
      await onSave(saveableFields as any)
      setOriginalValue(value)
      setHasChanges(false)
      toast({
        type: 'success',
        description: 'System prompt and rate limits saved successfully!'
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save configuration'
      setError(errorMessage)
      toast({
        type: 'error',
        description: errorMessage
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (originalValue) {
      onChange(originalValue)
      setHasChanges(false)
      toast({
        type: 'success',
        description: 'Configuration reset to last saved state'
      })
    }
    onReset?.()
  }

  const handleApiSave = async (configData: any) => {
    // Only save systemPrompt and rateLimit - other fields are handled by instant updates
    const saveableFields = {
      systemPrompt: configData.systemPrompt,
      rateLimit: configData.rateLimit
    }
    
    const response = await fetch(`/api/admin/config/${configKey}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(saveableFields),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Failed to save configuration')
    }

    return response.json()
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading configuration...
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleAgentToggle = async (enabled: boolean) => {
    // Update local state immediately
    onChange({ ...value, enabled })
    
    // Save to database instantly
    try {
      const response = await fetch(`/api/admin/config/${configKey}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update agent status')
      }

      // Update original value to reflect the saved state
      if (originalValue) {
        setOriginalValue({ ...originalValue, enabled })
      }

      toast({
        type: 'success',
        description: `Agent ${enabled ? 'enabled' : 'disabled'} successfully!`
      })
    } catch (err) {
      // Revert the local state change on error
      onChange({ ...value, enabled: !enabled })
      const errorMessage = err instanceof Error ? err.message : 'Failed to update agent status'
      setError(errorMessage)
      toast({
        type: 'error',
        description: errorMessage
      })
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Power className="h-5 w-5" />
                {title}
              </CardTitle>
              {description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {description}
                </p>
              )}
            </div>
            {showAgentToggle && (
              <div className="flex items-center gap-2">
                <Label htmlFor="agent-enabled" className="text-sm font-medium">
                  Agent Enabled
                </Label>
                <Switch
                  id="agent-enabled"
                  checked={value.enabled}
                  onCheckedChange={handleAgentToggle}
                />
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className={`space-y-6 ${!value.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* System Prompt & Rate Limits Card with Save Button */}
      <Card>
        <CardHeader>
          <CardTitle>System Prompt & Rate Limits</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure the agent's behavior and usage limits. Changes require manual saving.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* System Prompt Section */}
          {systemPromptSection}
          
          {/* Rate Limit Section */}
          {rateLimitSection}
          
          {/* Save Controls */}
          <div className="border-t pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {hasChanges ? (
                    <>
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-yellow-600 dark:text-yellow-400">
                        Unsaved changes to system prompt or rate limits
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600 dark:text-green-400">
                        System prompt and rate limits saved
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={!hasChanges || saving}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  
                  <Button
                    type="button"
                    onClick={() => onSave ? handleSave() : handleApiSave(value)}
                    disabled={!hasChanges || saving}
                    title="Save system prompt and rate limit changes"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Prompt & Limits
                  </Button>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Models, capabilities, and tools are saved automatically when changed. Only system prompt and rate limits require manual saving.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Other configuration sections (tools, capabilities, etc.) */}
      {children}
      </div>
    </div>
  )
}