'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Save, Plus } from 'lucide-react'
import type { ModelConfig } from '@/types/admin'

// Use ModelConfig from shared types as ModelConfigData
type ModelConfigData = ModelConfig

interface ModelConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (model: ModelConfigData) => void
  model?: ModelConfigData | null
  existingModels: ModelConfigData[]
}

export function ModelConfigModal({
  isOpen,
  onClose,
  onSave,
  model,
  existingModels
}: ModelConfigModalProps) {
  const [formData, setFormData] = useState<ModelConfigData>({
    id: '',
    name: '',
    description: '',
    isDefault: false,
    pricingPerMillionTokens: {
      input: 0,
      output: 0
    },
    enabled: true,
    thinkingEnabled: true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const isEditing = !!model

  useEffect(() => {
    if (model) {
      setFormData(model)
    } else {
      setFormData({
        id: '',
        name: '',
        description: '',
        isDefault: false,
        pricingPerMillionTokens: {
          input: 0,
          output: 0
        },
        enabled: true,
        thinkingEnabled: true
      })
    }
    setErrors({})
  }, [model, isOpen])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.id.trim()) {
      newErrors.id = 'Model ID is required'
    } else if (!isEditing && existingModels.some(m => m.id === formData.id)) {
      newErrors.id = 'Model ID already exists'
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Model name is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Model description is required'
    }

    if (formData.pricingPerMillionTokens.input < 0) {
      newErrors.inputPrice = 'Input pricing must be non-negative'
    }

    if (formData.pricingPerMillionTokens.output < 0) {
      newErrors.outputPrice = 'Output pricing must be non-negative'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    onSave(formData)
    onClose()
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handlePricingChange = (type: 'input' | 'output', value: string) => {
    const numValue = parseFloat(value) || 0
    setFormData(prev => ({
      ...prev,
      pricingPerMillionTokens: {
        ...prev.pricingPerMillionTokens,
        [type]: numValue
      }
    }))
    
    const errorKey = type === 'input' ? 'inputPrice' : 'outputPrice'
    if (errors[errorKey]) {
      setErrors(prev => ({
        ...prev,
        [errorKey]: ''
      }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Save className="h-5 w-5" />
                Edit Model: {model?.name}
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Add New Model
              </>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Model ID */}
            <div className="space-y-2">
              <Label htmlFor="modelId">Model ID *</Label>
              <Input
                id="modelId"
                value={formData.id}
                onChange={(e) => handleInputChange('id', e.target.value)}
                placeholder="e.g., gemini-2.0-flash"
                disabled={isEditing}
                className={errors.id ? 'border-red-500' : ''}
              />
              {errors.id && (
                <p className="text-sm text-red-500">{errors.id}</p>
              )}
            </div>

            {/* Model Name */}
            <div className="space-y-2">
              <Label htmlFor="modelName">Model Name *</Label>
              <Input
                id="modelName"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Gemini 2.0 Flash"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the model's capabilities and use cases..."
                rows={3}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description}</p>
              )}
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <Label>Pricing per Million Tokens</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inputPrice">Input Price ($)</Label>
                  <Input
                    id="inputPrice"
                    type="number"
                    step="0.001"
                    min="0"
                    value={formData.pricingPerMillionTokens.input}
                    onChange={(e) => handlePricingChange('input', e.target.value)}
                    placeholder="0.075"
                    className={errors.inputPrice ? 'border-red-500' : ''}
                  />
                  {errors.inputPrice && (
                    <p className="text-sm text-red-500">{errors.inputPrice}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outputPrice">Output Price ($)</Label>
                  <Input
                    id="outputPrice"
                    type="number"
                    step="0.001"
                    min="0"
                    value={formData.pricingPerMillionTokens.output}
                    onChange={(e) => handlePricingChange('output', e.target.value)}
                    placeholder="0.30"
                    className={errors.outputPrice ? 'border-red-500' : ''}
                  />
                  {errors.outputPrice && (
                    <p className="text-sm text-red-500">{errors.outputPrice}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Default Model</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Set this as the default model for this agent
                  </p>
                </div>
                <Switch
                  checked={formData.isDefault || false}
                  onCheckedChange={(checked) => handleInputChange('isDefault', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enabled</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Make this model available for use
                  </p>
                </div>
                <Switch
                  checked={formData.enabled}
                  onCheckedChange={(checked) => handleInputChange('enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Thinking & Reasoning</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Enable advanced reasoning capabilities for this model
                  </p>
                </div>
                <Switch
                  checked={formData.thinkingEnabled ?? true}
                  onCheckedChange={(checked) => handleInputChange('thinkingEnabled', checked)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? 'Update Model' : 'Add Model'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}