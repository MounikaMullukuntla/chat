'use client'

import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SystemPromptEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  description?: string
}

export function SystemPromptEditor({
  value,
  onChange,
  placeholder = "Enter the system prompt for this agent...",
  label = "System Prompt",
  description = "Define how the AI agent should behave and respond to user requests."
}: SystemPromptEditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-medium">{label}</h4>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[120px]"
        rows={5}
      />
    </div>
  )
}