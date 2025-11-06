'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Clock, AlertTriangle } from 'lucide-react'

interface RateLimitConfig {
  hourly: {
    type: 'hourly'
    value: number
  }
  daily: {
    type: 'daily'
    value: number
  }
}

interface EnhancedRateLimitConfigurationProps {
  value: RateLimitConfig
  onChange: (config: RateLimitConfig) => void
  label?: string
  description?: string
}

export function EnhancedRateLimitConfiguration({
  value,
  onChange,
  label = "Rate Limits",
  description = "Configure both hourly and daily request limits for this agent."
}: EnhancedRateLimitConfigurationProps) {
  // Provide default values if value is undefined or incomplete
  const safeValue = {
    hourly: {
      type: 'hourly' as const,
      value: value?.hourly?.value || 50
    },
    daily: {
      type: 'daily' as const,
      value: value?.daily?.value || 100
    }
  }

  const handleHourlyChange = (inputValue: string) => {
    const numValue = parseInt(inputValue, 10)
    if (!isNaN(numValue) && numValue > 0) {
      onChange({
        ...safeValue,
        hourly: { ...safeValue.hourly, value: numValue }
      })
    }
  }

  const handleDailyChange = (inputValue: string) => {
    const numValue = parseInt(inputValue, 10)
    if (!isNaN(numValue) && numValue > 0) {
      onChange({
        ...safeValue,
        daily: { ...safeValue.daily, value: numValue }
      })
    }
  }


  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <h4 className="text-sm font-medium">{label}</h4>
      </div>
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      )}
      <div className="grid grid-cols-2 gap-6">
        {/* Hourly Limit */}
        <div className="space-y-3">
          <Label htmlFor="hourly-limit">Hourly Limit</Label>
          <Input
            id="hourly-limit"
            type="number"
            min="1"
            max="1000"
            value={safeValue.hourly.value}
            onChange={(e) => handleHourlyChange(e.target.value)}
            placeholder="Enter hourly limit"
          />
        </div>

        {/* Daily Limit */}
        <div className="space-y-3">
          <Label htmlFor="daily-limit">Daily Limit</Label>
          <Input
            id="daily-limit"
            type="number"
            min="1"
            max="10000"
            value={safeValue.daily.value}
            onChange={(e) => handleDailyChange(e.target.value)}
            placeholder="Enter daily limit"
          />
        </div>
      </div>
    </div>
  )
}