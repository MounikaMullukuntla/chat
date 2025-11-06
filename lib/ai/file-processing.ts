// File processing system for extracting content from various file types
// Implements requirement 2.1, 2.2, 2.3, 2.4, 2.5

export interface FileAttachment {
  name: string;
  url: string;
  mediaType: string;
  size?: number;
}

export async function extractFileContent(attachment: FileAttachment): Promise<string> {
  try {
    const response = await fetch(attachment.url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const { mediaType, name } = attachment;

    // Handle different file types based on media type
    if (mediaType.startsWith('text/')) {
      // Text files - direct content extraction
      const content = await response.text();
      return content;
    }
    
    if (mediaType === 'application/json') {
      // JSON files - structured data parsing
      const content = await response.text();
      try {
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed, null, 2);
      } catch {
        // If JSON parsing fails, return as text
        return content;
      }
    }
    
    if (mediaType.startsWith('image/')) {
      // Images - return metadata and description
      const buffer = await response.arrayBuffer();
      const sizeKB = Math.round(buffer.byteLength / 1024);
      return `Image file: ${name}\nType: ${mediaType}\nSize: ${sizeKB}KB\n[Image content cannot be extracted as text, but can be processed by vision models]`;
    }
    
    if (mediaType === 'application/pdf') {
      // PDF files - placeholder for text extraction
      // In a real implementation, you would use a PDF parsing library
      return `PDF file: ${name}\n[PDF text extraction not implemented yet - will be added in future updates]`;
    }
    
    // Code files based on file extension
    const extension = name.split('.').pop()?.toLowerCase();
    const codeExtensions = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt'];
    
    if (extension && codeExtensions.includes(extension)) {
      // Code files - syntax-aware processing
      const content = await response.text();
      return `Code file (${extension}): ${name}\n\`\`\`${extension}\n${content}\n\`\`\``;
    }
    
    // Default: try to read as text
    const content = await response.text();
    return content;
    
  } catch (error) {
    console.error(`Error processing file ${attachment.name}:`, error);
    throw new Error(`Failed to process file ${attachment.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function validateFileAttachment(attachment: FileAttachment): { valid: boolean; error?: string } {
  // Basic validation
  if (!attachment.name || !attachment.url || !attachment.mediaType) {
    return { valid: false, error: 'Missing required file properties' };
  }
  
  // Size validation (if provided)
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB limit
  if (attachment.size && attachment.size > maxSizeBytes) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
  }
  
  // Supported file types
  const supportedTypes = [
    'text/',
    'application/json',
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  const isSupported = supportedTypes.some(type => attachment.mediaType.startsWith(type));
  if (!isSupported) {
    return { valid: false, error: `Unsupported file type: ${attachment.mediaType}` };
  }
  
  return { valid: true };
}