import axios from 'axios'

const API_BASE = 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
})

api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK') {
      console.error('[VoxCut] Backend not running')
    }
    return Promise.reject(error)
  }
)

export interface Job {
  job_id: string
  status: string
  progress: number
  file_name?: string
  file_size?: number
  original_file?: string
  processed_file?: string
  metadata?: Record<string, any>
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
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000,
  })
  return response.data
}

// URLs
export function getStreamUrl(jobId: string): string {
  return `${API_BASE}/stream/${jobId}`
}

export function getProcessedStreamUrl(jobId: string): string {
  return `${API_BASE}/stream/${jobId}/processed`
}

export function getDownloadUrl(jobId: string): string {
  return `${API_BASE}/download/${jobId}`
}

// Job status
export async function getJobStatus(jobId: string): Promise<Job> {
  const response = await api.get(`/job/${jobId}`)
  return response.data
}

export async function deleteJob(jobId: string): Promise<void> {
  await api.delete(`/job/${jobId}`)
}

// AI Processing
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

export async function autoClip(jobId: string): Promise<ProcessingResult> {
  const response = await api.post(`/process/auto-clip/${jobId}`)
  return response.data
}

export async function extractHighlights(jobId: string): Promise<ProcessingResult> {
  const response = await api.post(`/process/highlights/${jobId}`)
  return response.data
}

export async function autoEnhance(jobId: string, options: {
  remove_silence?: boolean
  stabilize?: boolean
  denoise?: boolean
  color_correct?: boolean
} = {}): Promise<ProcessingResult> {
  const response = await api.post(`/process/auto-enhance/${jobId}`, options)
  return response.data
}

// Video Editing
export async function cutVideo(jobId: string, startTime: number, endTime: number): Promise<ProcessingResult> {
  const response = await api.post(`/edit/cut/${jobId}`, { start_time: startTime, end_time: endTime })
  return response.data
}

export async function changeSpeed(jobId: string, speed: number): Promise<ProcessingResult> {
  const response = await api.post(`/edit/speed/${jobId}`, { speed })
  return response.data
}

export async function addTextOverlay(jobId: string, params: {
  text: string
  start_time: number
  end_time: number
  position?: string
  font_size?: number
  color?: string
}): Promise<ProcessingResult> {
  const response = await api.post(`/edit/text/${jobId}`, params)
  return response.data
}

export async function applyEffect(jobId: string, effectType: string, params: Record<string, any> = {}): Promise<ProcessingResult> {
  const response = await api.post(`/edit/effect/${jobId}`, { effect_type: effectType, params })
  return response.data
}

export async function applyTransition(jobId: string, transitionType: string, duration: number = 1.0): Promise<ProcessingResult> {
  const response = await api.post(`/edit/transition/${jobId}`, { transition_type: transitionType, duration })
  return response.data
}

// Captions
export interface Caption {
  id: number
  start: number
  end: number
  text: string
}

export async function getCaptions(jobId: string): Promise<{ captions: Caption[] }> {
  const response = await api.get(`/captions/${jobId}`)
  return response.data
}

export async function saveCaptions(jobId: string, captions: Caption[]): Promise<{ status: string }> {
  const response = await api.post(`/captions/${jobId}`, { captions })
  return response.data
}

export async function burnCaptions(jobId: string): Promise<ProcessingResult> {
  const response = await api.post(`/captions/${jobId}/burn`)
  return response.data
}

// Clips
export interface Clip {
  id: string
  path: string
  start_time?: number
  end_time?: number
  duration?: number
  score?: number
}

export async function getClips(jobId: string): Promise<{ clips: Clip[] }> {
  const response = await api.get(`/clips/${jobId}`)
  return response.data
}

// Voice commands
export async function executeCommand(jobId: string, command: string, params: Record<string, any> = {}): Promise<{
  status: string
  command: string
  job_id: string
  action?: string
}> {
  const response = await api.post(`/job/${jobId}/command`, { command, params })
  return response.data
}

// Health check
export async function healthCheck(): Promise<{ status: string; version: string }> {
  const response = await api.get('/health')
  return response.data
}

export async function isBackendAvailable(): Promise<boolean> {
  try {
    await api.get('/health', { timeout: 3000 })
    return true
  } catch {
    return false
  }
}

// WebSocket for real-time updates
export function createJobWebSocket(
  jobId: string,
  onProgress: (progress: number, message: string) => void,
  onComplete: (result: any) => void,
  onError: (error: string) => void
): WebSocket {
  const ws = new WebSocket(`ws://localhost:8000/ws/${jobId}`)
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'progress') {
        onProgress(data.progress || 0, data.message || '')
      } else if (data.type === 'complete') {
        onComplete(data)
      } else if (data.type === 'error') {
        onError(data.error || 'Unknown error')
      } else if (data.type === 'status' && data.data) {
        const status = data.data
        if (status.status === 'completed') {
          onComplete(status)
        } else if (status.status === 'failed') {
          onError(status.error || 'Processing failed')
        } else {
          onProgress(status.progress || 0, status.status || '')
        }
      }
    } catch (e) {
      console.error('WebSocket parse error:', e)
    }
  }
  
  ws.onerror = () => onError('WebSocket connection error')
  
  return ws
}

// Polling helper
export async function pollJobStatus(
  jobId: string,
  onProgress: (progress: number, status: string) => void,
  interval = 500
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

// ============================================
// Voiceover / Text-to-Speech
// ============================================

export interface Voice {
  id: string
  name: string
  accent: string
}

export async function generateVoiceover(jobId: string, text: string, voiceId: string = "21m00Tcm4TlvDq8ikWAM"): Promise<ProcessingResult> {
  const response = await api.post(`/voiceover/generate/${jobId}`, { text, voice_id: voiceId })
  return response.data
}

export async function addVoiceoverToVideo(jobId: string, audioPath: string): Promise<ProcessingResult> {
  const response = await api.post(`/voiceover/add/${jobId}`, null, { params: { audio_path: audioPath } })
  return response.data
}

export async function getVoices(): Promise<{ voices: Voice[] }> {
  const response = await api.get('/voiceover/voices')
  return response.data
}

// ============================================
// AI Summary
// ============================================

export async function generateAISummary(jobId: string): Promise<ProcessingResult> {
  const response = await api.post(`/ai/summary/${jobId}`)
  return response.data
}

// ============================================
// Burn Subtitles with Style
// ============================================

export async function burnSubtitlesStyled(jobId: string, captions: Caption[], style: string = "default"): Promise<ProcessingResult> {
  const response = await api.post(`/subtitles/burn/${jobId}`, { captions, style })
  return response.data
}

// ============================================
// Health check with API status
// ============================================

export interface HealthStatus {
  status: string
  version: string
  timestamp: string
  apis: {
    openai: boolean
    assemblyai: boolean
    gemini: boolean
    elevenlabs: boolean
  }
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const response = await api.get('/health')
  return response.data
}
