'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Cpu, Edit, Trash2, Plus, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { ModelConfigModal } from './model-config-modal'
import type { ModelConfig } from '@/types/admin'

interface EnhancedModelSelectorProps {
  models?: ModelConfig[]
  onModelsChange?: (models: ModelConfig[]) => void
  provider?: string
  label?: string
  description?: string
}

export function EnhancedModelSelector({
  provider = 'google',
  label = "Model Configuration",
  description = "Configure available models with pricing information.",
  models: propModels = [],
  onModelsChange
}: EnhancedModelSelectorProps) {
  const [models, setModels] = useState<ModelConfig[]>(propModels)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [actionType, setActionType] = useState<string | null>(null)
  const hasFetchedRef = useRef(false)

  const fetchModels = useCallback(async () => {
    if (!provider) return
    
    setLoading(true)
    try {
      // Fetch models directly from the model_config table by provider
      const response = await fetch(`/api/admin/models?provider=${provider}`)
      
      if (response.ok) {
        const data = await response.json()
        // Transform the database model format to the component's expected format
        const transformedModels = data.map((model: any) => ({
          id: model.modelId,
          name: model.name,
          description: model.description || '',
          pricingPerMillionTokens: {
            input: parseFloat(model.inputPricingPerMillionTokens),
            output: parseFloat(model.outputPricingPerMillionTokens)
          },
          enabled: model.isActive || false,
          isDefault: model.isDefault || false,
          thinkingEnabled: model.thinkingEnabled ?? true
        }))
        setModels(transformedModels)
      } else {
        console.error(`Failed to fetch models: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to fetch models:', error)
    } finally {
      setLoading(false)
    }
  }, [provider])

  useEffect(() => {
    if (propModels.length > 0) {
      setModels(propModels)
      setLoading(false)
      hasFetchedRef.current = true
    } else if (provider && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      fetchModels()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propModels, provider])

  const handleModelAction = async (action: string, modelId: string, data?: any) => {
    if (!provider) {
      // Fallback to local state update
      handleLocalModelUpdate(action, modelId, data)
      return
    }

    setUpdating(modelId)
    setActionType(action)
    setUpdateStatus(null)

    try {
      // Store original models for potential revert
      const originalModels = [...models]
      
      // Optimistically update local state first
      const updatedModels = getUpdatedModels(action, modelId, data)
      setModels(updatedModels)
      if (onModelsChange) {
        onModelsChange(updatedModels)
      }

      let response: Response
      let successMessage = 'Model updated successfully'

      switch (action) {
        case 'toggle_status':
          response = await fetch(`/api/admin/models/${modelId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: data.enabled })
          })
          successMessage = `Model ${data.enabled ? 'enabled' : 'disabled'} successfully`
          break

        case 'toggle_thinking':
          response = await fetch(`/api/admin/models/${modelId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ thinkingEnabled: data.thinkingEnabled })
          })
          successMessage = `Model thinking ${data.thinkingEnabled ? 'enabled' : 'disabled'} successfully`
          break

        case 'set_default':
          response = await fetch(`/api/admin/models/${modelId}/set-default`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          successMessage = 'Default model updated successfully'
          break

        case 'add':
          response = await fetch(`/api/admin/models`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              modelId: data.id,
              name: data.name,
              description: data.description,
              provider: provider,
              isActive: data.enabled,
              isDefault: data.isDefault,
              thinkingEnabled: data.thinkingEnabled ?? true,
              inputPricingPerMillionTokens: data.pricingPerMillionTokens.input.toString(),
              outputPricingPerMillionTokens: data.pricingPerMillionTokens.output.toString()
            })
          })
          successMessage = 'Model added successfully'
          break

        case 'update':
          response = await fetch(`/api/admin/models/${modelId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: data.name,
              description: data.description,
              isActive: data.enabled,
              isDefault: data.isDefault,
              thinkingEnabled: data.thinkingEnabled ?? true,
              inputPricingPerMillionTokens: data.pricingPerMillionTokens.input.toString(),
              outputPricingPerMillionTokens: data.pricingPerMillionTokens.output.toString()
            })
          })
          successMessage = 'Model configuration updated successfully'
          break

        case 'delete':
          response = await fetch(`/api/admin/models/${modelId}`, {
            method: 'DELETE'
          })
          successMessage = 'Model deleted successfully'
          break

        default:
          throw new Error(`Unknown action: ${action}`)
      }

      if (response.ok) {
        // Refresh models from server to ensure consistency
        await fetchModels()
        setUpdateStatus({ type: 'success', message: successMessage })
      } else {
        // Revert optimistic update on failure
        setModels(originalModels)
        if (onModelsChange) {
          onModelsChange(originalModels)
        }
        
        let errorMessage = 'Failed to update model'
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch {
          errorMessage = `Failed to update model (${response.status})`
        }
        setUpdateStatus({ type: 'error', message: errorMessage })
      }
    } catch (error) {
      // Revert optimistic update on failure
      const originalModels = [...models]
      setModels(originalModels)
      if (onModelsChange) {
        onModelsChange(originalModels)
      }
      setUpdateStatus({ 
        type: 'error', 
        message: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    } finally {
      setUpdating(null)
      setActionType(null)
      // Clear status after 4 seconds for better user experience
      setTimeout(() => setUpdateStatus(null), 4000)
    }
  }

  const getUpdatedModels = (action: string, modelId: string, data?: any): ModelConfig[] => {
    let updatedModels = [...models]

    switch (action) {
      case 'toggle_status':
        updatedModels = models.map(model => 
          model.id === modelId ? { ...model, enabled: data.enabled } : model
        )
        break
      case 'toggle_thinking':
        updatedModels = models.map(model => 
          model.id === modelId ? { ...model, thinkingEnabled: data.thinkingEnabled } : model
        )
        break
      case 'set_default':
        updatedModels = models.map(model => ({
          ...model,
          isDefault: model.id === modelId
        }))
        break
      case 'update':
        updatedModels = models.map(model => 
          model.id === modelId ? { ...model, ...data } : model
        )
        break
      case 'add':
        updatedModels = [...models, data]
        break
      case 'delete':
        updatedModels = models.filter(model => model.id !== modelId)
        break
    }

    return updatedModels
  }

  const handleLocalModelUpdate = (action: string, modelId: string, data?: any) => {
    let updatedModels = [...models]

    switch (action) {
      case 'toggle_status':
        updatedModels = models.map(model => 
          model.id === modelId ? { ...model, enabled: data.enabled } : model
        )
        break
      case 'toggle_thinking':
        updatedModels = models.map(model => 
          model.id === modelId ? { ...model, thinkingEnabled: data.thinkingEnabled } : model
        )
        break
      case 'set_default':
        updatedModels = models.map(model => ({
          ...model,
          isDefault: model.id === modelId
        }))
        break
    }

    setModels(updatedModels)
    if (onModelsChange) {
      onModelsChange(updatedModels)
    }
  }

  const handleToggleStatus = (modelId: string, enabled: boolean) => {
    handleModelAction('toggle_status', modelId, { enabled })
  }

  const handleToggleDefault = (modelId: string, isDefault: boolean) => {
    if (isDefault) {
      handleModelAction('set_default', modelId)
    }
  }

  const handleToggleThinking = (modelId: string, thinkingEnabled: boolean) => {
    handleModelAction('toggle_thinking', modelId, { thinkingEnabled })
  }

  const handleEditModel = (model: ModelConfig) => {
    setEditingModel(model)
    setModalOpen(true)
  }

  const handleAddModel = () => {
    setEditingModel(null)
    setModalOpen(true)
  }

  const handleSaveModel = async (modelData: ModelConfig) => {
    if (!provider) {
      // Fallback to local state update
      if (editingModel) {
        const updatedModels = models.map(m => 
          m.id === editingModel.id ? modelData : m
        )
        setModels(updatedModels)
        if (onModelsChange) {
          onModelsChange(updatedModels)
        }
      } else {
        const updatedModels = [...models, modelData]
        setModels(updatedModels)
        if (onModelsChange) {
          onModelsChange(updatedModels)
        }
      }
      return
    }

    const action = editingModel ? 'update' : 'add'
    const modelId = editingModel ? editingModel.id : modelData.id
    
    await handleModelAction(action, modelId, modelData)
  }

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model?')) {
      return
    }

    if (!provider) {
      // Fallback to local state update
      const updatedModels = models.filter(m => m.id !== modelId)
      setModels(updatedModels)
      if (onModelsChange) {
        onModelsChange(updatedModels)
      }
      return
    }

    await handleModelAction('delete', modelId)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading models...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                {label}
              </CardTitle>
              {description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {description}
                </p>
              )}
            </div>
            <Button onClick={handleAddModel} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Model
            </Button>
          </div>
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
          
          {/* Loading Status */}
          {updating && (
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  {actionType === 'toggle_status' && 'Updating model status...'}
                  {actionType === 'toggle_thinking' && 'Updating thinking setting...'}
                  {actionType === 'set_default' && 'Setting default model...'}
                  {actionType === 'add' && 'Adding new model...'}
                  {actionType === 'update' && 'Updating model configuration...'}
                  {actionType === 'delete' && 'Deleting model...'}
                  {!actionType && 'Updating model...'}
                </AlertDescription>
              </div>
            </Alert>
          )}
          {/* Available Models Table */}
          <div className="space-y-2">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 grid grid-cols-7 gap-4 text-sm font-medium">
                <div>Model</div>
                <div>Description</div>
                <div className="text-center">Pricing per Million Tokens</div>
                <div className="text-center">Default</div>
                <div className="text-center">Enabled</div>
                <div className="text-center">Thinking</div>
                <div className="text-center">Actions</div>
              </div>
              {models.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No models configured. Click "Add Model" to get started.
                </div>
              ) : (
                models.map((model) => (
                  <div key={model.id} className="px-4 py-3 border-t grid grid-cols-7 gap-4 items-center">
                    <div>
                      <div className="font-medium">{model.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {model.id}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {model.description}
                    </div>
                    <div className="text-center">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-600 dark:text-gray-400">Input:</span>
                          <span className="font-medium">${model.pricingPerMillionTokens.input.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">Output:</span>
                          <span className="font-medium">${model.pricingPerMillionTokens.output.toFixed(3)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={model.isDefault || false}
                          onCheckedChange={(checked) => handleToggleDefault(model.id, checked)}
                          disabled={model.isDefault || updating === model.id}
                        />
                        {updating === model.id && actionType === 'set_default' && (
                          <Loader2 className="h-3 w-3 animate-spin text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      {model.isDefault && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Default
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={model.enabled}
                          onCheckedChange={(enabled) => handleToggleStatus(model.id, enabled)}
                          disabled={updating === model.id}
                        />
                        {updating === model.id && actionType === 'toggle_status' && (
                          <Loader2 className="h-3 w-3 animate-spin text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="text-xs mt-1">
                        <span className={model.enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                          {updating === model.id && actionType === 'toggle_status' ? 'Updating...' : model.enabled ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={model.thinkingEnabled ?? true}
                          onCheckedChange={(enabled) => handleToggleThinking(model.id, enabled)}
                          disabled={updating === model.id}
                        />
                        {updating === model.id && actionType === 'toggle_thinking' && (
                          <Loader2 className="h-3 w-3 animate-spin text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="text-xs mt-1">
                        <span className={model.thinkingEnabled ?? true ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                          {updating === model.id && actionType === 'toggle_thinking' ? 'Updating...' : model.thinkingEnabled ?? true ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="text-center flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditModel(model)}
                        className="h-8 w-8 p-0"
                        title="Edit model"
                        disabled={updating === model.id}
                      >
                        {updating === model.id && actionType === 'update' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Edit className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteModel(model.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        title="Delete model"
                        disabled={updating === model.id}
                      >
                        {updating === model.id && actionType === 'delete' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Configure available models with pricing per million tokens. Only one model can be set as default at a time.
          </div>
        </CardContent>
      </Card>

      <ModelConfigModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveModel}
        model={editingModel}
        existingModels={models}
      />
    </>
  )
}