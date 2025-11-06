'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Brain, FileInput, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface Capabilities {
  thinkingReasoning: boolean
  fileInput?: boolean
}

interface CapabilitiesConfigurationProps {
  value: Capabilities
  onChange: (capabilities: Capabilities) => void
  label?: string
  description?: string
  showFileInput?: boolean
  className?: string
  configKey?: string
  enableInstantUpdates?: boolean
}

export function CapabilitiesConfiguration({
  value,
  onChange,
  label = "Agent Capabilities",
  description = "Configure the capabilities available to this agent.",
  showFileInput = false,
  className = "",
  configKey,
  enableInstantUpdates = false
}: CapabilitiesConfigurationProps) {
  const [updating, setUpdating] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const handleCapabilityChange = async (capability: keyof Capabilities, enabled: boolean) => {
    const newCapabilities = {
      ...value,
      [capability]: enabled
    }

    // Always update local state first
    onChange(newCapabilities)

    // If instant updates are enabled and we have a config key, make PATCH call
    if (enableInstantUpdates && configKey) {
      setUpdating(capability)
      setUpdateStatus(null)

      try {
        const response = await fetch(`/api/admin/config/${configKey}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            capabilities: newCapabilities
          }),
        })

        if (response.ok) {
          const updatedConfig = await response.json()
          onChange(updatedConfig.configData.capabilities)
          setUpdateStatus({ type: 'success', message: 'Capability updated successfully' })
        } else {
          // Revert optimistic update on failure
          onChange(value)
          const errorText = await response.text()
          setUpdateStatus({ type: 'error', message: `Failed to update capability: ${errorText}` })
        }
      } catch (error) {
        // Revert optimistic update on failure
        onChange(value)
        setUpdateStatus({ type: 'error', message: `Failed to update capability: ${error instanceof Error ? error.message : 'Unknown error'}` })
      } finally {
        setUpdating(null)
        // Clear status after 3 seconds
        setTimeout(() => setUpdateStatus(null), 3000)
      }
    }
  }

  const handleThinkingReasoningChange = (enabled: boolean) => {
    handleCapabilityChange('thinkingReasoning', enabled)
  }

  const handleFileInputChange = (enabled: boolean) => {
    handleCapabilityChange('fileInput', enabled)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
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
        {/* Thinking/Reasoning Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="thinking-reasoning" className="text-base font-medium">
              Thinking & Reasoning
            </Label>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enable advanced reasoning capabilities for complex problem solving
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="thinking-reasoning"
              checked={value.thinkingReasoning}
              onCheckedChange={handleThinkingReasoningChange}
              disabled={updating === 'thinkingReasoning'}
            />
            {updating === 'thinkingReasoning' && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
            )}
          </div>
        </div>

        {/* File Input Toggle (Chat Model only) */}
        {showFileInput && (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="file-input" className="text-base font-medium flex items-center gap-2">
                <FileInput className="h-4 w-4" />
                File Input
              </Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Allow users to upload and process files in conversations
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="file-input"
                checked={value.fileInput || false}
                onCheckedChange={handleFileInputChange}
                disabled={updating === 'fileInput'}
              />
              {updating === 'fileInput' && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400">
          {showFileInput 
            ? "File input is only available for the Chat Model Agent."
            : "Configure which capabilities this agent should have access to."
          }
        </div>
      </CardContent>
    </Card>
  )
}