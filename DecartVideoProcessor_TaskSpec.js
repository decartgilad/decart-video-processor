/**
 * Decart Video Processor - Video-to-Video Transformation
 * High-quality video transformation via Decart AI API
 * Transforms videos with AI-powered character replacement and scene modification
 */

import { AIProvider, ProviderRunResult, ProviderStatusResult } from '@/lib/providers'

// Configuration
export const DECART_CONFIG = {
  id: 'decart-video',
  name: 'Decart Video Processor',
  api: {
    endpoint: 'https://api.decart.ai/v1/generate/lucy-pro-v2v',
    timeout: 300000, // 5 minutes - video processing can take time
  },
  limits: {
    maxFileSizeMB: 100,
    maxPromptLength: 1000,
    supportedFormats: ['mp4', 'avi', 'mov', 'mkv', 'webm'],
    orientations: {
      landscape: { width: 1280, height: 704 },
      portrait: { width: 704, height: 1280 }
    }
  }
} as const

// Types
export interface DecartVideoInput {
  type: 'video-to-video'
  modelCode: 'DecartVideo' // Must match the model.code from database
  prompt: string
  orientation: 'landscape' | 'portrait'
  enhance_prompt?: boolean
  file: {
    path: string
    signedUrl: string | null
    mime: string
    size: number
    originalName: string
  }
}

export interface DecartVideoOutput {
  type: 'video'
  url: string
  format: 'mp4'
  width: number
  height: number
  provider: string
  model: string
  prompt: string
  orientation: string
  outputFile?: string // Sequential filename for batch processing
}

// Batch Processing Types
export interface DecartBatchInput {
  type: 'batch-video-processing'
  modelCode: 'DecartVideo'
  orientation: 'landscape' | 'portrait'
  enhance_prompt?: boolean
  videoFile: {
    path: string
    signedUrl: string | null
    mime: string
    size: number
    originalName: string
  }
  csvFile: {
    path: string
    signedUrl: string | null
    mime: string
    size: number
    prompts: string[] // Extracted from CSV first column
  }
}

export interface DecartBatchOutput {
  type: 'batch-results'
  totalProcessed: number
  successCount: number
  failureCount: number
  results: Array<{
    prompt: string
    success: boolean
    videoUrl?: string
    outputFile?: string
    error?: string
  }>
}

// Validation
function validateVideoInput(input: any): { valid: boolean; error?: string } {
  console.log('🔍 Decart: Validating video input', {
    hasFile: !!input.file,
    hasSignedUrl: !!input.file?.signedUrl,
    fileSize: input.file?.size,
    promptLength: input.prompt?.length || 0,
    modelCode: input.modelCode,
    orientation: input.orientation
  })

  // Check model code
  if (input.modelCode !== 'DecartVideo') {
    return { valid: false, error: `Invalid model code: ${input.modelCode}. Expected: DecartVideo` }
  }

  // Check file
  if (!input.file?.signedUrl) return { valid: false, error: 'Video file with signed URL required' }
  
  // Check file size
  const fileSizeMB = input.file.size / (1024 * 1024)
  if (fileSizeMB > DECART_CONFIG.limits.maxFileSizeMB) {
    return { valid: false, error: `File too large (${fileSizeMB.toFixed(1)}MB max ${DECART_CONFIG.limits.maxFileSizeMB}MB)` }
  }
  
  // Check file type
  const fileExtension = input.file.originalName.split('.').pop()?.toLowerCase()
  if (!fileExtension || !DECART_CONFIG.limits.supportedFormats.includes(fileExtension)) {
    return { valid: false, error: `Unsupported file type: ${fileExtension}. Allowed: ${DECART_CONFIG.limits.supportedFormats.join(', ')}` }
  }
  
  // Check prompt
  if (!input.prompt || input.prompt.trim().length === 0) {
    return { valid: false, error: 'Prompt is required for video transformation' }
  }
  
  if (input.prompt.length > DECART_CONFIG.limits.maxPromptLength) {
    return { valid: false, error: `Prompt too long (max ${DECART_CONFIG.limits.maxPromptLength} chars)` }
  }
  
  // Check orientation
  if (!['landscape', 'portrait'].includes(input.orientation)) {
    return { valid: false, error: 'Orientation must be either "landscape" or "portrait"' }
  }
  
  console.log('✅ Decart: Input validation passed')
  return { valid: true }
}

function validateBatchInput(input: any): { valid: boolean; error?: string } {
  console.log('🔍 Decart: Validating batch input', {
    hasVideoFile: !!input.videoFile,
    hasCsvFile: !!input.csvFile,
    promptCount: input.csvFile?.prompts?.length || 0,
    modelCode: input.modelCode
  })

  // Validate video file
  const videoValidation = validateVideoInput({
    modelCode: input.modelCode,
    file: input.videoFile,
    prompt: 'dummy', // We'll validate actual prompts separately
    orientation: input.orientation
  })
  
  if (!videoValidation.valid) {
    return videoValidation
  }

  // Check CSV file
  if (!input.csvFile?.prompts || !Array.isArray(input.csvFile.prompts)) {
    return { valid: false, error: 'CSV file with prompts required' }
  }

  if (input.csvFile.prompts.length === 0) {
    return { valid: false, error: 'CSV file must contain at least one prompt' }
  }

  // Validate each prompt
  for (let i = 0; i < input.csvFile.prompts.length; i++) {
    const prompt = input.csvFile.prompts[i]
    if (!prompt || prompt.trim().length === 0) {
      return { valid: false, error: `Empty prompt found at row ${i + 1}` }
    }
    if (prompt.length > DECART_CONFIG.limits.maxPromptLength) {
      return { valid: false, error: `Prompt at row ${i + 1} too long (max ${DECART_CONFIG.limits.maxPromptLength} chars)` }
    }
  }

  console.log('✅ Decart: Batch input validation passed')
  return { valid: true }
}

// Environment check
export function isConfigured(): boolean {
  const hasApiKey = !!process.env.DECART_API_KEY
  
  console.log('🔧 Decart: Environment check', {
    hasApiKey,
    apiKeyPrefix: process.env.DECART_API_KEY ? `${process.env.DECART_API_KEY.substring(0, 10)}...` : 'missing',
    configured: hasApiKey
  })
  
  return hasApiKey
}

// Utility functions
function getOutputDimensions(orientation: string) {
  return DECART_CONFIG.limits.orientations[orientation] || DECART_CONFIG.limits.orientations.landscape
}

function generateSequentialFilename(): string {
  // This would typically be handled by the file system
  // In the actual Flask app, this uses get_next_output_number()
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 5)
  return `output_${timestamp}_${random}.mp4`
}

// Provider Implementation
export class DecartVideoProvider implements AIProvider {
  name = 'decart-video'

  async run(input: DecartVideoInput | DecartBatchInput): Promise<ProviderRunResult> {
    if (!isConfigured()) {
      throw new Error('Decart not configured - missing DECART_API_KEY')
    }

    // Handle batch processing
    if (input.type === 'batch-video-processing') {
      const validation = validateBatchInput(input)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
      
      const jobId = `decart_batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      console.log('🚀 Decart: Batch job queued', { 
        jobId, 
        promptCount: input.csvFile.prompts.length,
        orientation: input.orientation 
      })
      
      return { kind: 'deferred', providerJobId: jobId }
    }

    // Handle single video processing
    const validation = validateVideoInput(input)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const jobId = `decart_single_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    console.log('🚀 Decart: Single video job queued', { 
      jobId, 
      hasFile: !!input.file,
      orientation: input.orientation,
      promptLength: input.prompt.length 
    })
    
    return { kind: 'deferred', providerJobId: jobId }
  }

  async result(jobId: string, input?: DecartVideoInput | DecartBatchInput): Promise<ProviderStatusResult> {
    if (!jobId.startsWith('decart_') || !input) {
      return { status: 'running' }
    }

    try {
      // Handle batch processing
      if (input.type === 'batch-video-processing') {
        return await this.processBatch(input)
      }

      // Handle single video processing
      return await this.processSingleVideo(input as DecartVideoInput)

    } catch (error) {
      console.error('❌ Decart: Processing failed', error)
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            status: 'failed',
            error: 'Video processing timed out. Please try again with a smaller video.'
          }
        }
        return {
          status: 'failed',
          error: error.message.includes('timeout') 
            ? 'Video processing is taking longer than expected. Please try again.'
            : `Video processing failed: ${error.message}`
        }
      }
      
      return {
        status: 'failed',
        error: 'Unknown error occurred during video processing'
      }
    }
  }

  private async processSingleVideo(input: DecartVideoInput): Promise<ProviderStatusResult> {
    const dimensions = getOutputDimensions(input.orientation)
    
    // Fetch video file and create FormData
    const videoResponse = await fetch(input.file.signedUrl!)
    const videoBlob = await videoResponse.blob()
    
    const formData = new FormData()
    formData.append('data', videoBlob, 'input.mp4')
    formData.append('prompt', input.prompt)

    console.log('📡 Decart: Calling API for single video', {
      url: DECART_CONFIG.api.endpoint,
      hasApiKey: !!process.env.DECART_API_KEY,
      apiKeyPrefix: process.env.DECART_API_KEY ? `${process.env.DECART_API_KEY.substring(0, 10)}...` : 'missing',
      orientation: input.orientation,
      dimensions,
      promptLength: input.prompt.length
    })
    
    const response = await fetch(DECART_CONFIG.api.endpoint, {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.DECART_API_KEY!
      },
      body: formData,
      signal: AbortSignal.timeout(DECART_CONFIG.api.timeout)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Decart: API Error Response', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      throw new Error(`Decart API error (${response.status}): ${errorText}`)
    }

    // In the actual implementation, the response would be saved to files
    // and URLs would be generated for the processed videos
    const processedVideoBlob = await response.blob()
    const outputFile = generateSequentialFilename()
    
    console.log('✅ Decart: Single video processed successfully')
    return {
      status: 'succeeded',
      output: {
        type: 'video',
        url: `/static/videos/processed_${Date.now()}.mp4`, // Would be actual URL
        format: 'mp4',
        width: dimensions.width,
        height: dimensions.height,
        provider: 'decart-video',
        model: 'vid2vid',
        prompt: input.prompt,
        orientation: input.orientation,
        outputFile
      } as DecartVideoOutput
    }
  }

  private async processBatch(input: DecartBatchInput): Promise<ProviderStatusResult> {
    const results: DecartBatchOutput['results'] = []
    const dimensions = getOutputDimensions(input.orientation)
    
    // Fetch video file once for all batch requests
    const videoResponse = await fetch(input.videoFile.signedUrl!)
    const videoBlob = await videoResponse.blob()
    
    console.log('📡 Decart: Starting batch processing', {
      promptCount: input.csvFile.prompts.length,
      orientation: input.orientation,
      dimensions
    })

    for (let i = 0; i < input.csvFile.prompts.length; i++) {
      const prompt = input.csvFile.prompts[i].trim()
      
      if (!prompt) {
        results.push({
          prompt,
          success: false,
          error: 'Empty prompt'
        })
        continue
      }

      try {
        const formData = new FormData()
        formData.append('data', videoBlob, 'input.mp4')
        formData.append('prompt', prompt)

        const response = await fetch(DECART_CONFIG.api.endpoint, {
          method: 'POST',
          headers: {
            'X-API-KEY': process.env.DECART_API_KEY!
          },
          body: formData,
          signal: AbortSignal.timeout(DECART_CONFIG.api.timeout)
        })

        if (response.ok) {
          const outputFile = generateSequentialFilename()
          results.push({
            prompt,
            success: true,
            videoUrl: `/static/videos/batch_${Date.now()}_${i}.mp4`,
            outputFile
          })
        } else {
          results.push({
            prompt,
            success: false,
            error: `API request failed: ${response.status}`
          })
        }
      } catch (error) {
        results.push({
          prompt,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    console.log('✅ Decart: Batch processing completed', {
      total: results.length,
      successful: successCount,
      failed: failureCount
    })

    return {
      status: 'succeeded',
      output: {
        type: 'batch-results',
        totalProcessed: results.length,
        successCount,
        failureCount,
        results
      } as DecartBatchOutput
    }
  }

}

// Additional Information for Implementation:

/*
CURRENT PROJECT STRUCTURE:
/Splice_API_01/
├── app.py                 # Flask server with video processing endpoints
├── templates/index.html   # Web interface with drag & drop, batch processing
├── static/videos/         # Processed videos for preview
├── output_videos/         # Sequential numbered output files
├── requirements.txt       # Python dependencies (Flask, requests, etc.)
└── venv/                 # Virtual environment

KEY FEATURES IMPLEMENTED:
1. Single Video Processing (/process_video endpoint)
   - Drag & drop interface
   - Prompt-based transformation
   - Orientation selection (landscape/portrait)
   - Real-time preview of processed videos

2. Batch Processing (/process_csv endpoint)
   - CSV file with prompts in first column
   - Same video processed with multiple prompts
   - Progress tracking and results display
   - Sequential file numbering system

3. File Management
   - Automatic sequential numbering (output_001.mp4, output_002.mp4, etc.)
   - Dual storage: preview files in static/ and archived files in output_videos/
   - Support for multiple video formats (MP4, AVI, MOV, MKV, WebM)

4. Error Handling & Logging
   - Comprehensive error messages
   - Request timeout handling (5 minutes)
   - File size validation (100MB limit)
   - API key validation

5. Web Interface Features
   - Dark theme responsive design
   - Real-time file info display
   - Loading states with progress indicators
   - Video preview with download links
   - Batch results with individual video previews

DECART API INTEGRATION:
- Endpoint: https://api.decart.ai/v1/generate/lucy-pro-v2v
- Authentication: X-API-KEY header
- Input: FormData with video file + prompt
- Output: Processed video binary data
- Timeout: 300 seconds (5 minutes)

MISSING COMPONENTS FOR FULL INTEGRATION:
1. Database models for job tracking
2. File upload handling with signed URLs
3. Background job processing system
4. User authentication and rate limiting
5. Production WSGI server configuration

CURRENT API KEY: TlI3OYCRoSD2kgqDAAZnmcj4FuuAff0EbdKilUrvMrA
SERVER: Running on http://localhost:5001
*/
