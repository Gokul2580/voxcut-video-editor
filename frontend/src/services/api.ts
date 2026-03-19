import axios from 'axios'

const API_BASE = 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

export interface Job {
  job_id: string
  status: string
  progress: number
  file_name?: string
  file_size?: number
  original_file?: string
  processed_file?: string
  results?: Record<string, unknown>
  error?: string
}

export interface ProcessingResult {
  status: string
  operation: string
  job_id: string
}

// Upload video
export async function uploadVideo(file: File): Promise<Job> {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  
  return response.data
}

// Get job status
export async function getJobStatus(jobId: string): Promise<Job> {
  const response = await api.get(`/job/${jobId}`)
  return response.data
}

// Stream video URL
export function getStreamUrl(jobId: string): string {
  return `${API_BASE}/stream/${jobId}`
}

// Stream processed video URL
export function getProcessedStreamUrl(jobId: string): string {
  return `${API_BASE}/stream/${jobId}/processed`
}

// Download video URL
export function getDownloadUrl(jobId: string): string {
  return `${API_BASE}/download/${jobId}`
}

// AI Processing endpoints
export async function removeSilence(jobId: string): Promise<ProcessingResult> {
  const response = await api.post(`/process/remove-silence/${jobId}`)
  return response.data
}

export async function stabilizeVideo(jobId: string): Promise<ProcessingResult> {
  const response = await api.post(`/process/stabilize/${jobId}`)
  return response.data
}

export async function denoiseAudio(jobId: string): Promise<ProcessingResult> {
  const response = await api.post(`/process/denoise/${jobId}`)
  return response.data
}

export async function generateCaptions(jobId: string): Promise<ProcessingResult> {
  const response = await api.post(`/process/captions/${jobId}`)
  return response.data
}

export async function detectScenes(jobId: string): Promise<ProcessingResult> {
  const response = await api.post(`/process/scene-detect/${jobId}`)
  return response.data
}

export async function colorCorrect(jobId: string): Promise<ProcessingResult> {
  const response = await api.post(`/process/color-correct/${jobId}`)
  return response.data
}

export async function autoEnhance(
  jobId: string, 
  options: {
    remove_silence?: boolean
    stabilize?: boolean
    denoise?: boolean
    auto_captions?: boolean
    color_correct?: boolean
  }
): Promise<ProcessingResult> {
  const response = await api.post(`/process/auto-enhance/${jobId}`, options)
  return response.data
}

// Execute voice/text command
export async function executeCommand(
  jobId: string, 
  command: string, 
  params: Record<string, unknown> = {}
): Promise<{ status: string; action: string; [key: string]: unknown }> {
  const response = await api.post(`/job/${jobId}/command`, { command, params })
  return response.data
}

// Delete job
export async function deleteJob(jobId: string): Promise<void> {
  await api.delete(`/job/${jobId}`)
}

// Health check
export async function healthCheck(): Promise<{ status: string; version: string }> {
  const response = await api.get('/health')
  return response.data
}

// Poll job status until complete
export async function pollJobStatus(
  jobId: string, 
  onProgress: (progress: number, status: string) => void,
  interval = 1000
): Promise<Job> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const job = await getJobStatus(jobId)
        onProgress(job.progress, job.status)
        
        if (job.status === 'completed') {
          resolve(job)
        } else if (job.status === 'failed') {
          reject(new Error(job.error || 'Processing failed'))
        } else {
          setTimeout(poll, interval)
        }
      } catch (error) {
        reject(error)
      }
    }
    poll()
  })
}
