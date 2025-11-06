'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  FileInput, 
  ChevronDown, 
  ChevronRight, 
  Code, 
  FileText, 
  FileImage, 
  File,
  CheckCircle, 
  XCircle, 
  Loader2 
} from 'lucide-react'
import { useState } from 'react'

interface FileTypeConfig {
  enabled: boolean
}

interface FileTypeCategory {
  [key: string]: FileTypeConfig
}

interface FileInputTypes {
  codeFiles: FileTypeCategory
  textFiles: FileTypeCategory
  pdf: FileTypeConfig
  ppt: FileTypeConfig
  excel: FileTypeConfig
  images: FileTypeConfig
}

interface FileTypeConfigurationProps {
  value: FileInputTypes
  onChange: (fileTypes: FileInputTypes) => void
  label?: string
  description?: string
  className?: string
  configKey?: string
  enableInstantUpdates?: boolean
  fileInputEnabled?: boolean
  onFileInputChange?: (enabled: boolean) => void
}

// Default file type configuration
const getDefaultFileTypes = (): FileInputTypes => ({
  codeFiles: {
    py: { enabled: true },
    ipynb: { enabled: true },
    js: { enabled: true },
    jsx: { enabled: true },
    ts: { enabled: true },
    tsx: { enabled: true },
    html: { enabled: true },
    css: { enabled: true },
    json: { enabled: true },
    xml: { enabled: true },
    sql: { enabled: true },
    sh: { enabled: true },
    bat: { enabled: true },
    ps1: { enabled: true }
  },
  textFiles: {
    txt: { enabled: true },
    md: { enabled: true },
    yaml: { enabled: true },
    yml: { enabled: true },
    toml: { enabled: true },
    ini: { enabled: true },
    cfg: { enabled: true },
    conf: { enabled: true },
    log: { enabled: true },
    csv: { enabled: true }
  },
  pdf: { enabled: true },
  ppt: { enabled: true },
  excel: { enabled: true },
  images: { enabled: true }
})

// File type category metadata
const categoryMetadata = {
  codeFiles: {
    title: 'Code Files',
    icon: Code,
    description: 'Programming and markup language files',
    extensions: {
      py: 'Python',
      ipynb: 'Jupyter Notebook',
      js: 'JavaScript',
      jsx: 'React JSX',
      ts: 'TypeScript',
      tsx: 'React TSX',
      html: 'HTML',
      css: 'CSS',
      json: 'JSON',
      xml: 'XML',
      sql: 'SQL',
      sh: 'Shell Script',
      bat: 'Batch File',
      ps1: 'PowerShell'
    }
  },
  textFiles: {
    title: 'Text/YAML/Doc Files',
    icon: FileText,
    description: 'Text documents and configuration files',
    extensions: {
      txt: 'Plain Text',
      md: 'Markdown',
      yaml: 'YAML',
      yml: 'YAML',
      toml: 'TOML',
      ini: 'INI Config',
      cfg: 'Configuration',
      conf: 'Configuration',
      log: 'Log File',
      csv: 'CSV'
    }
  },
  pdf: {
    title: 'PDF',
    icon: File,
    description: 'Portable Document Format files'
  },
  ppt: {
    title: 'PowerPoint',
    icon: File,
    description: 'Microsoft PowerPoint presentations'
  },
  excel: {
    title: 'Excel',
    icon: File,
    description: 'Microsoft Excel spreadsheets'
  },
  images: {
    title: 'Images',
    icon: FileImage,
    description: 'Image files (PNG, JPG, GIF, etc.)'
  }
}

export function FileTypeConfiguration({
  value = getDefaultFileTypes(),
  onChange,
  label = "File Input Types",
  description = "Configure which file types users can upload for processing.",
  className = "",
  configKey,
  enableInstantUpdates = false,
  fileInputEnabled = true,
  onFileInputChange
}: FileTypeConfigurationProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['codeFiles']))
  const [updating, setUpdating] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const handleFileInputToggle = async (enabled: boolean) => {
    if (onFileInputChange) {
      onFileInputChange(enabled)
    }

    // If instant updates are enabled and we have a config key, make PATCH call
    if (enableInstantUpdates && configKey) {
      setUpdating('fileInput')
      setUpdateStatus(null)

      try {
        const response = await fetch(`/api/admin/config/${configKey}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            capabilities: {
              fileInput: enabled
            }
          }),
        })

        if (response.ok) {
          setUpdateStatus({ type: 'success', message: 'File input setting updated successfully' })
        } else {
          // Revert optimistic update on failure
          if (onFileInputChange) {
            onFileInputChange(!enabled)
          }
          const errorText = await response.text()
          setUpdateStatus({ type: 'error', message: `Failed to update file input: ${errorText}` })
        }
      } catch (error) {
        // Revert optimistic update on failure
        if (onFileInputChange) {
          onFileInputChange(!enabled)
        }
        setUpdateStatus({ type: 'error', message: `Failed to update file input: ${error instanceof Error ? error.message : 'Unknown error'}` })
      } finally {
        setUpdating(null)
        // Clear status after 3 seconds
        setTimeout(() => setUpdateStatus(null), 3000)
      }
    }
  }

  const handleFileTypeChange = async (category: string, fileType: string | null, enabled: boolean) => {
    const newFileTypes = { ...value }
    
    if (fileType) {
      // Individual file type within a category
      if (category === 'codeFiles' || category === 'textFiles') {
        const categoryData = newFileTypes[category as 'codeFiles' | 'textFiles'] as FileTypeCategory
        newFileTypes[category as 'codeFiles' | 'textFiles'] = {
          ...categoryData,
          [fileType]: { enabled }
        }
      }
    } else {
      // Top-level category (pdf, ppt, excel, images)
      if (category === 'pdf' || category === 'ppt' || category === 'excel' || category === 'images') {
        (newFileTypes[category] as FileTypeConfig).enabled = enabled
      }
    }

    // Always update local state first
    onChange(newFileTypes)

    // If instant updates are enabled and we have a config key, make PATCH call
    if (enableInstantUpdates && configKey) {
      const updateKey = fileType ? `${category}.${fileType}` : category
      setUpdating(updateKey)
      setUpdateStatus(null)

      try {
        const response = await fetch(`/api/admin/config/${configKey}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileInputTypes: newFileTypes
          }),
        })

        if (response.ok) {
          const updatedConfig = await response.json()
          onChange(updatedConfig.configData.fileInputTypes || newFileTypes)
          setUpdateStatus({ type: 'success', message: 'File type updated successfully' })
        } else {
          // Revert optimistic update on failure
          onChange(value)
          const errorText = await response.text()
          setUpdateStatus({ type: 'error', message: `Failed to update file type: ${errorText}` })
        }
      } catch (error) {
        // Revert optimistic update on failure
        onChange(value)
        setUpdateStatus({ type: 'error', message: `Failed to update file type: ${error instanceof Error ? error.message : 'Unknown error'}` })
      } finally {
        setUpdating(null)
        // Clear status after 3 seconds
        setTimeout(() => setUpdateStatus(null), 3000)
      }
    }
  }

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const renderCategoryToggle = (category: string, fileType: string | null = null) => {
    const updateKey = fileType ? `${category}.${fileType}` : category
    const isUpdating = updating === updateKey
    
    let isEnabled = false
    if (fileType && (category === 'codeFiles' || category === 'textFiles')) {
      const categoryData = value[category as keyof FileInputTypes] as FileTypeCategory
      isEnabled = categoryData[fileType]?.enabled ?? false
    } else if (!fileType) {
      isEnabled = (value[category as keyof FileInputTypes] as FileTypeConfig).enabled ?? false
    }

    return (
      <div className="flex items-center gap-2">
        <Switch
          checked={isEnabled}
          onCheckedChange={(enabled) => handleFileTypeChange(category, fileType, enabled)}
          disabled={isUpdating}
        />
        {isUpdating && (
          <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileInput className="h-5 w-5" />
          {label}
        </CardTitle>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
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

        {/* File Input Toggle */}
        {onFileInputChange && (
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
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
                checked={fileInputEnabled}
                onCheckedChange={handleFileInputToggle}
                disabled={updating === 'fileInput'}
              />
              {updating === 'fileInput' && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
              )}
            </div>
          </div>
        )}

        {/* File Type Categories - Only show if file input is enabled */}
        {fileInputEnabled && (
          <div className="space-y-4">{/* This div will wrap the existing categories */}

        {/* Code Files Category */}
        <Collapsible 
          open={expandedCategories.has('codeFiles')} 
          onOpenChange={() => toggleCategory('codeFiles')}
        >
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-md transition-colors">
              {expandedCategories.has('codeFiles') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Code className="h-4 w-4" />
              <div className="text-left">
                <Label className="text-base font-medium cursor-pointer">
                  {categoryMetadata.codeFiles.title}
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {categoryMetadata.codeFiles.description}
                </p>
              </div>
            </CollapsibleTrigger>
            {renderCategoryToggle('codeFiles')}
          </div>
          <CollapsibleContent className="ml-6 mt-2 space-y-2">
            {Object.entries(categoryMetadata.codeFiles.extensions).map(([ext, name]) => (
              <div key={ext} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <Label className="text-sm">
                    .{ext} - {name}
                  </Label>
                </div>
                {renderCategoryToggle('codeFiles', ext)}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Text Files Category */}
        <Collapsible 
          open={expandedCategories.has('textFiles')} 
          onOpenChange={() => toggleCategory('textFiles')}
        >
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-md transition-colors">
              {expandedCategories.has('textFiles') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <FileText className="h-4 w-4" />
              <div className="text-left">
                <Label className="text-base font-medium cursor-pointer">
                  {categoryMetadata.textFiles.title}
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {categoryMetadata.textFiles.description}
                </p>
              </div>
            </CollapsibleTrigger>
            {renderCategoryToggle('textFiles')}
          </div>
          <CollapsibleContent className="ml-6 mt-2 space-y-2">
            {Object.entries(categoryMetadata.textFiles.extensions).map(([ext, name]) => (
              <div key={ext} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <Label className="text-sm">
                    .{ext} - {name}
                  </Label>
                </div>
                {renderCategoryToggle('textFiles', ext)}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Simple Categories (PDF, PPT, Excel, Images) */}
        {(['pdf', 'ppt', 'excel', 'images'] as const).map((category) => {
          const metadata = categoryMetadata[category]
          const IconComponent = metadata.icon
          
          return (
            <div key={category} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconComponent className="h-4 w-4" />
                <div>
                  <Label className="text-base font-medium">
                    {metadata.title}
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {metadata.description}
                  </p>
                </div>
              </div>
              {renderCategoryToggle(category)}
            </div>
          )
        })}

        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t">
          Configure which file types users can upload. Disabled file types will be rejected during upload.
        </div>
        </div>
        )}

        {!fileInputEnabled && onFileInputChange && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FileInput className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>File input is disabled. Enable it above to configure file types.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}