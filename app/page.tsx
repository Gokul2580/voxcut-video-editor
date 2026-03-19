"use client"

import { useRef, useState, useCallback, useEffect } from 'react'
import { create } from 'zustand'
import {
  Upload,
  Film,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  ZoomIn,
  ZoomOut,
  Download,
  Loader2,
  Wand2,
  Sparkles,
  Subtitles,
  Music,
  Type,
  Layers,
  Scissors,
  Settings,
  Mic,
  MicOff,
  Check,
  AlertCircle,
  X,
  RotateCcw,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  ChevronRight,
  Clock,
  Sun,
  Moon,
  Contrast,
  Palette,
  Zap,
  HelpCircle
} from 'lucide-react'
import axios from 'axios'

// ============================================
// API Service
// ============================================
const API_BASE = 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
})

interface Job {
  id: string
  status: string
  progress: number
  original_file?: string
  processed_file?: string
  metadata?: Record<string, any>
  error?: string
}

async function uploadVideo(file: File): Promise<Job> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000,
  })
  return response.data
}

function getStreamUrl(jobId: string): string {
  return `${API_BASE}/stream/${jobId}`
}

function getProcessedStreamUrl(jobId: string): string {
  return `${API_BASE}/stream/${jobId}/processed`
}

function getDownloadUrl(jobId: string): string {
  return `${API_BASE}/download/${jobId}`
}

async function getJobStatus(jobId: string): Promise<Job> {
  const response = await api.get(`/job/${jobId}`)
  return response.data
}

// AI Processing
async function removeSilence(jobId: string) {
  return (await api.post(`/process/remove-silence/${jobId}`)).data
}

async function stabilizeVideo(jobId: string) {
  return (await api.post(`/process/stabilize/${jobId}`)).data
}

async function denoiseAudio(jobId: string) {
  return (await api.post(`/process/denoise/${jobId}`)).data
}

async function generateCaptions(jobId: string) {
  return (await api.post(`/process/captions/${jobId}`)).data
}

async function detectScenes(jobId: string) {
  return (await api.post(`/process/scene-detect/${jobId}`)).data
}

async function colorCorrect(jobId: string) {
  return (await api.post(`/process/color-correct/${jobId}`)).data
}

async function autoEnhance(jobId: string, options: {
  remove_silence?: boolean
  stabilize?: boolean
  denoise?: boolean
  color_correct?: boolean
} = {}) {
  return (await api.post(`/process/auto-enhance/${jobId}`, options)).data
}

async function pollJobStatus(
  jobId: string,
  onProgress: (progress: number, status: string) => void,
  interval = 500
): Promise<Job> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const job = await getJobStatus(jobId)
        onProgress(job.progress, job.status)
        if (job.status === 'completed') resolve(job)
        else if (job.status === 'failed') reject(new Error(job.error || 'Processing failed'))
        else setTimeout(poll, interval)
      } catch (error) {
        reject(error)
      }
    }
    poll()
  })
}

async function getCaptions(jobId: string) {
  return (await api.get(`/captions/${jobId}`)).data
}

async function isBackendAvailable(): Promise<boolean> {
  try {
    await api.get('/health', { timeout: 3000 })
    return true
  } catch {
    return false
  }
}

async function getHealthStatus() {
  return (await api.get('/health')).data
}

// Voiceover
async function generateVoiceover(jobId: string, text: string, voiceId: string = "21m00Tcm4TlvDq8ikWAM") {
  return (await api.post(`/voiceover/generate/${jobId}`, { text, voice_id: voiceId })).data
}

async function getVoices() {
  return (await api.get('/voiceover/voices')).data
}

// AI Summary
async function generateAISummary(jobId: string) {
  return (await api.post(`/ai/summary/${jobId}`)).data
}

// Burn subtitles with style
async function burnSubtitlesStyled(jobId: string, captions: any[], style: string = "default") {
  return (await api.post(`/subtitles/burn/${jobId}`, { captions, style })).data
}

// Save and load captions
async function saveCaptions(jobId: string, captions: any[]) {
  return (await api.post(`/captions/${jobId}`, { captions })).data
}

// ============================================
// Editor Store
// ============================================
interface VideoClip {
  id: string
  name: string
  src: string
  duration: number
  startTime: number
  endTime: number
  trackIndex: number
}

interface TextOverlay {
  id: string
  text: string
  startTime: number
  endTime: number
  position: { x: number; y: number }
  style: {
    fontSize: number
    fontFamily: string
    color: string
  }
}

interface Effect {
  id: string
  type: 'filter' | 'transition' | 'animation'
  name: string
  params: Record<string, unknown>
  startTime: number
  endTime: number
}

interface EditorState {
  videoFile: File | null
  videoUrl: string | null
  videoDuration: number
  jobId: string | null
  isPlaying: boolean
  currentTime: number
  volume: number
  playbackRate: number
  videoClips: VideoClip[]
  textOverlays: TextOverlay[]
  effects: Effect[]
  zoom: number
  selectedClipId: string | null
  activePanel: 'tools' | 'effects' | 'ai' | 'captions' | 'voiceover'
  isProcessing: boolean
  processingProgress: number
  processingMessage: string
  isListening: boolean
  showWelcome: boolean
  captions: { id: number; start: number; end: number; text: string }[]
  
  setVideoFile: (file: File | null) => void
  setVideoUrl: (url: string | null) => void
  setVideoDuration: (duration: number) => void
  setJobId: (jobId: string | null) => void
  setIsPlaying: (playing: boolean) => void
  setCurrentTime: (time: number) => void
  setVolume: (volume: number) => void
  setPlaybackRate: (rate: number) => void
  addVideoClip: (clip: VideoClip) => void
  updateVideoClip: (id: string, updates: Partial<VideoClip>) => void
  removeVideoClip: (id: string) => void
  addTextOverlay: (overlay: TextOverlay) => void
  removeTextOverlay: (id: string) => void
  addEffect: (effect: Effect) => void
  removeEffect: (id: string) => void
  setZoom: (zoom: number) => void
  setSelectedClipId: (id: string | null) => void
  setActivePanel: (panel: EditorState['activePanel']) => void
  setProcessing: (isProcessing: boolean, message?: string) => void
  setProcessingProgress: (progress: number) => void
  setIsListening: (listening: boolean) => void
  setShowWelcome: (show: boolean) => void
  setCaptions: (captions: EditorState['captions']) => void
  addCaption: (caption: EditorState['captions'][0]) => void
  updateCaption: (id: number, updates: Partial<EditorState['captions'][0]>) => void
  removeCaption: (id: number) => void
}

const useEditorStore = create<EditorState>((set) => ({
  videoFile: null,
  videoUrl: null,
  videoDuration: 0,
  jobId: null,
  isPlaying: false,
  currentTime: 0,
  volume: 1,
  playbackRate: 1,
  videoClips: [],
  textOverlays: [],
  effects: [],
  zoom: 1,
  selectedClipId: null,
  activePanel: 'tools',
  isProcessing: false,
  processingProgress: 0,
  processingMessage: '',
  isListening: false,
  showWelcome: true,
  captions: [],
  
  setVideoFile: (file) => set({ videoFile: file }),
  setVideoUrl: (url) => set({ videoUrl: url }),
  setVideoDuration: (duration) => set({ videoDuration: duration }),
  setJobId: (jobId) => set({ jobId }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setVolume: (volume) => set({ volume }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  addVideoClip: (clip) => set((s) => ({ videoClips: [...s.videoClips, clip] })),
  updateVideoClip: (id, updates) => set((s) => ({
    videoClips: s.videoClips.map((c) => c.id === id ? { ...c, ...updates } : c)
  })),
  removeVideoClip: (id) => set((s) => ({ videoClips: s.videoClips.filter((c) => c.id !== id) })),
  addTextOverlay: (overlay) => set((s) => ({ textOverlays: [...s.textOverlays, overlay] })),
  removeTextOverlay: (id) => set((s) => ({ textOverlays: s.textOverlays.filter((o) => o.id !== id) })),
  addEffect: (effect) => set((s) => ({ effects: [...s.effects, effect] })),
  removeEffect: (id) => set((s) => ({ effects: s.effects.filter((e) => e.id !== id) })),
  setZoom: (zoom) => set({ zoom }),
  setSelectedClipId: (id) => set({ selectedClipId: id }),
  setActivePanel: (panel) => set({ activePanel: panel }),
  setProcessing: (isProcessing, message = '') => set({ isProcessing, processingMessage: message, processingProgress: isProcessing ? 0 : 100 }),
  setProcessingProgress: (progress) => set({ processingProgress: progress }),
  setIsListening: (listening) => set({ isListening: listening }),
  setShowWelcome: (show) => set({ showWelcome: show }),
  setCaptions: (captions) => set({ captions }),
  addCaption: (caption) => set((s) => ({ captions: [...s.captions, caption] })),
  updateCaption: (id, updates) => set((s) => ({
    captions: s.captions.map((c) => c.id === id ? { ...c, ...updates } : c)
  })),
  removeCaption: (id) => set((s) => ({ captions: s.captions.filter((c) => c.id !== id) })),
}))

// ============================================
// Welcome Dialog
// ============================================
function WelcomeDialog() {
  const { showWelcome, setShowWelcome } = useEditorStore()
  
  if (!showWelcome) return null
  
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 rounded-3xl max-w-2xl w-full border border-zinc-700/50 shadow-2xl overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-pink-600/20" />
          <div className="relative p-8 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-violet-600 rounded-2xl">
                <Film className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">VoxCut</h1>
                <p className="text-sm text-violet-400">AI Video Editor for Everyone</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="px-8 pb-8">
          <div className="space-y-4 text-zinc-300 leading-relaxed">
            <p className="text-lg">
              <span className="text-white font-semibold">Not everyone starts with the best resources.</span>
            </p>
            <p>
              There are thousands of creators from middle-class backgrounds who have powerful ideas, strong creativity, and real stories to tell.
            </p>
            <p>
              But they are often held back — not by lack of talent, but by <span className="text-violet-400 font-medium">lack of access to expensive devices and editing tools</span>.
            </p>
            <p className="text-lg font-semibold text-white">
              VoxCut is built for them.
            </p>
            <p>
              It turns raw, unedited videos into high-quality content without requiring technical skills or costly software.
            </p>
            <div className="pt-2 border-t border-zinc-700/50">
              <p className="text-violet-400 font-medium text-lg">
                Because creativity should never depend on money. It should depend on you.
              </p>
            </div>
          </div>
          
          <div className="mt-8 flex flex-col gap-4">
            <button
              onClick={() => setShowWelcome(false)}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
            >
              Start Creating
            </button>
            <div className="flex items-center justify-center gap-6 text-xs text-zinc-500">
              <span className="flex items-center gap-1"><Wand2 className="w-3 h-3" /> AI-Powered</span>
              <span className="flex items-center gap-1"><Mic className="w-3 h-3" /> Voice Control</span>
              <span className="flex items-center gap-1"><Subtitles className="w-3 h-3" /> Auto Captions</span>
              <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> One-Click Enhance</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Processing Overlay
// ============================================
function ProcessingOverlay() {
  const { processingMessage, processingProgress } = useEditorStore()
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-zinc-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-zinc-800">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-violet-500/30 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-violet-400 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-center mb-2">{processingMessage || 'Processing...'}</h3>
        <p className="text-sm text-zinc-500 text-center mb-6">Please wait while we process your video</p>
        <div className="space-y-2">
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-300" style={{ width: `${processingProgress}%` }} />
          </div>
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Progress</span>
            <span>{Math.round(processingProgress)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Video Preview
// ============================================
function VideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const {
    videoUrl, isPlaying, setIsPlaying, currentTime, setCurrentTime,
    volume, setVolume, playbackRate, setPlaybackRate, videoDuration, setVideoDuration
  } = useEditorStore()
  
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [previewScale, setPreviewScale] = useState(1)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    
    const onTimeUpdate = () => setCurrentTime(video.currentTime)
    const onLoadedMetadata = () => { setVideoDuration(video.duration); setIsVideoLoaded(true) }
    const onEnded = () => setIsPlaying(false)
    
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.addEventListener('ended', onEnded)
    
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      video.removeEventListener('ended', onEnded)
    }
  }, [setCurrentTime, setVideoDuration, setIsPlaying])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !isVideoLoaded) return
    if (isPlaying) video.play().catch(() => setIsPlaying(false))
    else video.pause()
  }, [isPlaying, isVideoLoaded, setIsPlaying])

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = isMuted ? 0 : volume
  }, [volume, isMuted])

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate
  }, [playbackRate])

  useEffect(() => {
    setIsVideoLoaded(false)
  }, [videoUrl])

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percentage = (e.clientX - rect.left) / rect.width
    const time = percentage * videoDuration
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercentage = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0
  const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2]

  return (
    <div className="flex-1 flex flex-col bg-black relative">
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl" style={{ transform: `scale(${previewScale})` }}>
          <video ref={videoRef} src={videoUrl || ''} className="max-h-[calc(100vh-350px)] max-w-full" onClick={() => setIsPlaying(!isPlaying)} playsInline crossOrigin="anonymous" />
          {!isPlaying && isVideoLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer" onClick={() => setIsPlaying(true)}>
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                <Play className="w-10 h-10 text-white ml-1" />
              </div>
            </div>
          )}
          {!isVideoLoaded && videoUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-2 bg-zinc-900/90 backdrop-blur-sm rounded-lg p-1">
        <button onClick={() => setPreviewScale(Math.max(0.5, previewScale - 0.1))} className="p-2 hover:bg-white/10 rounded transition-colors">
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs text-zinc-400 w-12 text-center">{Math.round(previewScale * 100)}%</span>
        <button onClick={() => setPreviewScale(Math.min(2, previewScale + 0.1))} className="p-2 hover:bg-white/10 rounded transition-colors">
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-zinc-900 border-t border-zinc-800 p-3">
        <div className="mb-3">
          <div className="w-full h-2 bg-zinc-700 rounded-full cursor-pointer group" onClick={handleProgressClick}>
            <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full relative" style={{ width: `${progressPercentage}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => videoRef.current && (videoRef.current.currentTime = Math.max(0, currentTime - 5))} className="p-2 hover:bg-white/10 rounded-lg">
              <SkipBack className="w-5 h-5" />
            </button>
            <button onClick={() => setIsPlaying(!isPlaying)} disabled={!isVideoLoaded} className="p-3 bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <button onClick={() => videoRef.current && (videoRef.current.currentTime = Math.min(videoDuration, currentTime + 5))} className="p-2 hover:bg-white/10 rounded-lg">
              <SkipForward className="w-5 h-5" />
            </button>
            <div className="text-sm font-mono text-zinc-400 ml-2">
              <span className="text-white">{formatTime(currentTime)}</span>
              <span className="mx-1">/</span>
              <span>{formatTime(videoDuration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Settings className="w-4 h-4 text-zinc-500" />
              <select value={playbackRate} onChange={(e) => setPlaybackRate(parseFloat(e.target.value))} className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm">
                {playbackRates.map((rate) => <option key={rate} value={rate}>{rate}x</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setIsMuted(!isMuted)} className="p-2 hover:bg-white/10 rounded-lg">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input type="range" min={0} max={1} step={0.01} value={isMuted ? 0 : volume} onChange={(e) => { setVolume(parseFloat(e.target.value)); if (parseFloat(e.target.value) > 0) setIsMuted(false) }} className="w-20 h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// AI Enhance Panel
// ============================================
function AIEnhancePanel() {
  const { jobId, videoFile, setProcessing, setProcessingProgress, setVideoUrl } = useEditorStore()
  const [activeTask, setActiveTask] = useState<string | null>(null)
  const [taskStatus, setTaskStatus] = useState<Record<string, 'idle' | 'processing' | 'done' | 'error'>>({})

  const AI_TOOLS = [
    { id: 'remove-silence', name: 'Remove Silence', description: 'Remove silent parts', icon: Volume2, endpoint: removeSilence },
    { id: 'captions', name: 'Auto Captions', description: 'Generate captions', icon: Subtitles, endpoint: generateCaptions },
    { id: 'stabilize', name: 'Stabilize', description: 'Reduce camera shake', icon: Film, endpoint: stabilizeVideo },
    { id: 'denoise', name: 'Denoise Audio', description: 'Remove background noise', icon: Music, endpoint: denoiseAudio },
    { id: 'color-correct', name: 'Color Correct', description: 'Auto color correction', icon: Palette, endpoint: colorCorrect },
    { id: 'scene-detect', name: 'Scene Detect', description: 'Find scene changes', icon: Zap, endpoint: detectScenes },
  ]

  const runAITool = async (tool: typeof AI_TOOLS[0]) => {
    if (!jobId) return
    setActiveTask(tool.id)
    setTaskStatus(prev => ({ ...prev, [tool.id]: 'processing' }))
    setProcessing(true, `Running ${tool.name}...`)

    try {
      await tool.endpoint(jobId)
      const job = await pollJobStatus(jobId, (progress, status) => {
        setProcessingProgress(progress)
        setProcessing(true, `${tool.name}: ${status} (${progress}%)`)
      })
      if (job.processed_file) setVideoUrl(getProcessedStreamUrl(jobId))
      setTaskStatus(prev => ({ ...prev, [tool.id]: 'done' }))
    } catch {
      setTaskStatus(prev => ({ ...prev, [tool.id]: 'error' }))
    } finally {
      setProcessing(false)
      setActiveTask(null)
      setTimeout(() => setTaskStatus(prev => ({ ...prev, [tool.id]: 'idle' })), 5000)
    }
  }

  const runAutoEnhance = async () => {
    if (!jobId) return
    setActiveTask('auto-enhance')
    setProcessing(true, 'Running Auto Enhance...')
    try {
      await autoEnhance(jobId, { remove_silence: true, stabilize: true, denoise: true, color_correct: true })
      await pollJobStatus(jobId, (progress, status) => {
        setProcessingProgress(progress)
        setProcessing(true, `Auto Enhance: ${status} (${progress}%)`)
      })
      setVideoUrl(getProcessedStreamUrl(jobId))
    } catch (e) { console.error(e) }
    finally { setProcessing(false); setActiveTask(null) }
  }

  const getStatusIcon = (toolId: string) => {
    const status = taskStatus[toolId]
    if (status === 'processing') return <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
    if (status === 'done') return <Check className="w-4 h-4 text-green-400" />
    if (status === 'error') return <AlertCircle className="w-4 h-4 text-red-400" />
    return <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white" />
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Wand2 className="w-5 h-5 text-violet-400" />
        <h2 className="text-lg font-semibold">AI Tools</h2>
      </div>

      {!videoFile && !jobId && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
          Upload a video to use AI tools
        </div>
      )}

      {videoFile && !jobId && (
        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-400 text-sm">
          <p className="font-medium">Backend not connected</p>
          <p className="text-xs mt-1">Start the backend server to enable AI features</p>
        </div>
      )}

      {jobId && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          AI tools ready
        </div>
      )}

      <div className="space-y-2">
        {AI_TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => runAITool(tool)}
            disabled={activeTask !== null || !jobId}
            className={`w-full p-3 rounded-xl text-left transition-all group ${activeTask === tool.id ? 'bg-violet-600/20 border border-violet-500/30' : 'bg-zinc-800 hover:bg-zinc-700 border border-transparent'} ${!jobId ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${activeTask === tool.id ? 'bg-violet-500/30' : 'bg-zinc-700'}`}>
                <tool.icon className={`w-5 h-5 ${activeTask === tool.id ? 'text-violet-400' : 'text-zinc-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{tool.name}</span>
                  {getStatusIcon(tool.id)}
                </div>
                <p className="text-xs text-zinc-500 truncate mt-0.5">{tool.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="pt-4 border-t border-zinc-700">
        <button onClick={runAutoEnhance} disabled={!jobId || activeTask !== null} className="w-full p-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-xl disabled:opacity-50">
          <div className="flex items-center justify-center gap-2">
            {activeTask === 'auto-enhance' ? <RotateCcw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            <span className="font-semibold">Auto Enhance All</span>
          </div>
          <p className="text-xs text-white/70 mt-1">Silence, stabilize, denoise, color</p>
        </button>
      </div>
    </div>
  )
}

// ============================================
// Voiceover Panel
// ============================================
function VoiceoverPanel() {
  const { jobId, setProcessing, setProcessingProgress, setVideoUrl } = useEditorStore()
  const [text, setText] = useState('')
  const [selectedVoice, setSelectedVoice] = useState('21m00Tcm4TlvDq8ikWAM')
  const [voices, setVoices] = useState<{ id: string; name: string; accent: string }[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    getVoices().then(data => setVoices(data.voices || [])).catch(() => {})
  }, [])

  const handleGenerate = async () => {
    if (!jobId || !text.trim()) return
    setIsGenerating(true)
    setProcessing(true, 'Generating voiceover...')
    
    try {
      await generateVoiceover(jobId, text, selectedVoice)
      await pollJobStatus(jobId, (progress, status) => {
        setProcessingProgress(progress)
        setProcessing(true, `Voiceover: ${status} (${progress}%)`)
      })
      setVideoUrl(getProcessedStreamUrl(jobId))
    } catch (e) {
      console.error('Voiceover failed:', e)
    } finally {
      setIsGenerating(false)
      setProcessing(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Mic className="w-5 h-5 text-violet-400" />
        <h2 className="text-lg font-semibold">Voiceover</h2>
      </div>

      {!jobId && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
          Upload a video first
        </div>
      )}

      {jobId && (
        <>
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Voice</label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
            >
              {voices.length > 0 ? voices.map(voice => (
                <option key={voice.id} value={voice.id}>{voice.name} ({voice.accent})</option>
              )) : (
                <>
                  <option value="21m00Tcm4TlvDq8ikWAM">Rachel (American)</option>
                  <option value="EXAVITQu4vr4xnSDxMaL">Bella (American)</option>
                  <option value="TxGEqnHWrfWFTfGW9XjX">Josh (American)</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Script</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter the voiceover script..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm min-h-32 resize-none"
            />
            <p className="text-xs text-zinc-500 mt-1">{text.length} characters</p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !text.trim()}
            className="w-full p-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                Generate Voiceover
              </>
            )}
          </button>
        </>
      )}
    </div>
  )
}

// ============================================
// Captions Panel
// ============================================
function CaptionsPanel() {
  const { jobId, currentTime, setProcessing, setProcessingProgress, setVideoUrl, captions, setCaptions, updateCaption } = useEditorStore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState('default')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isBurning, setIsBurning] = useState(false)

  const styles = [
    { id: 'default', name: 'Default', description: 'White with black outline' },
    { id: 'netflix', name: 'Netflix', description: 'Clean and minimal' },
    { id: 'youtube', name: 'YouTube', description: 'Yellow with shadow' },
    { id: 'karaoke', name: 'Karaoke', description: 'Colorful and bold' },
    { id: 'minimal', name: 'Minimal', description: 'Simple white text' },
  ]

  const loadCaptions = useCallback(async () => {
    if (!jobId) return
    try {
      const data = await getCaptions(jobId)
      if (data.captions) setCaptions(data.captions)
    } catch {}
  }, [jobId, setCaptions])

  useEffect(() => {
    loadCaptions()
  }, [loadCaptions])

  const handleGenerate = async () => {
    if (!jobId) return
    setIsGenerating(true)
    setProcessing(true, 'Generating captions...')
    
    try {
      await generateCaptions(jobId)
      const job = await pollJobStatus(jobId, (progress, status) => {
        setProcessingProgress(progress)
        setProcessing(true, `Captions: ${status} (${progress}%)`)
      })
      
      // Load the generated captions
      await loadCaptions()
    } catch (e) {
      console.error('Caption generation failed:', e)
    } finally {
      setIsGenerating(false)
      setProcessing(false)
    }
  }

  const handleBurn = async () => {
    if (!jobId || captions.length === 0) return
    setIsBurning(true)
    setProcessing(true, 'Burning subtitles...')
    
    try {
      await burnSubtitlesStyled(jobId, captions, selectedStyle)
      await pollJobStatus(jobId, (progress, status) => {
        setProcessingProgress(progress)
        setProcessing(true, `Burning: ${status} (${progress}%)`)
      })
      setVideoUrl(getProcessedStreamUrl(jobId))
    } catch (e) {
      console.error('Burn subtitles failed:', e)
    } finally {
      setIsBurning(false)
      setProcessing(false)
    }
  }

  const handleSave = async () => {
    if (!jobId) return
    try {
      await saveCaptions(jobId, captions)
    } catch (e) {
      console.error('Save captions failed:', e)
    }
  }

  const handleUpdateCaption = (id: number, field: string, value: string | number) => {
    updateCaption(id, { [field]: value })
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Subtitles className="w-5 h-5 text-violet-400" />
          <h2 className="text-lg font-semibold">Captions</h2>
        </div>
        {captions.length > 0 && (
          <span className="text-xs text-zinc-500">{captions.length} captions</span>
        )}
      </div>

      {!jobId && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
          Upload a video first
        </div>
      )}

      {jobId && (
        <>
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 p-3 bg-violet-600 hover:bg-violet-700 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate
            </button>
            <button
              onClick={handleSave}
              disabled={captions.length === 0}
              className="p-3 bg-zinc-700 hover:bg-zinc-600 rounded-xl disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>

          {captions.length > 0 && (
            <>
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Subtitle Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {styles.map(style => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      className={`p-2 rounded-lg text-left text-sm transition-all ${selectedStyle === style.id ? 'bg-violet-600/20 border border-violet-500' : 'bg-zinc-800 border border-transparent hover:bg-zinc-700'}`}
                    >
                      <span className="font-medium">{style.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {captions.map((caption) => (
                  <div
                    key={caption.id}
                    onClick={() => setEditingId(editingId === caption.id ? null : caption.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${currentTime >= caption.start && currentTime <= caption.end ? 'bg-violet-600/20 border border-violet-500/30' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                  >
                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                      <span>{formatTime(caption.start)} - {formatTime(caption.end)}</span>
                    </div>
                    {editingId === caption.id ? (
                      <input
                        type="text"
                        value={caption.text}
                        onChange={(e) => handleUpdateCaption(caption.id, 'text', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-sm"
                        autoFocus
                      />
                    ) : (
                      <p className="text-sm">{caption.text}</p>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleBurn}
                disabled={isBurning}
                className="w-full p-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isBurning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Type className="w-5 h-5" />}
                {isBurning ? 'Burning...' : 'Burn Subtitles into Video'}
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ============================================
// Toolbar Panel
// ============================================
function ToolbarPanel() {
  const { currentTime, videoDuration, videoClips, addVideoClip, selectedClipId, updateVideoClip, removeVideoClip } = useEditorStore()
  
  const handleSplit = () => {
    if (!selectedClipId) return
    const clip = videoClips.find(c => c.id === selectedClipId)
    if (clip && currentTime > clip.startTime && currentTime < clip.endTime) {
      addVideoClip({ ...clip, id: `clip-${Date.now()}`, startTime: currentTime })
      updateVideoClip(selectedClipId, { endTime: currentTime })
    }
  }

  const handleDuplicate = () => {
    if (!selectedClipId) return
    const clip = videoClips.find(c => c.id === selectedClipId)
    if (clip) {
      const duration = clip.endTime - clip.startTime
      addVideoClip({ ...clip, id: `clip-${Date.now()}`, startTime: clip.endTime, endTime: clip.endTime + duration })
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-5 h-5 text-violet-400" />
        <h2 className="text-lg font-semibold">Edit Tools</h2>
      </div>

      <div className="space-y-2">
        <button onClick={handleSplit} disabled={!selectedClipId} className="w-full p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-left disabled:opacity-50 flex items-center gap-3">
          <div className="p-2 bg-zinc-700 rounded-lg"><Scissors className="w-5 h-5 text-zinc-400" /></div>
          <div><span className="font-medium text-sm">Split at Playhead</span><p className="text-xs text-zinc-500">Split clip at current time</p></div>
        </button>

        <button onClick={handleDuplicate} disabled={!selectedClipId} className="w-full p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-left disabled:opacity-50 flex items-center gap-3">
          <div className="p-2 bg-zinc-700 rounded-lg"><Copy className="w-5 h-5 text-zinc-400" /></div>
          <div><span className="font-medium text-sm">Duplicate</span><p className="text-xs text-zinc-500">Copy selected clip</p></div>
        </button>

        <button onClick={() => selectedClipId && removeVideoClip(selectedClipId)} disabled={!selectedClipId} className="w-full p-3 bg-zinc-800 hover:bg-red-500/20 rounded-xl text-left disabled:opacity-50 flex items-center gap-3 group">
          <div className="p-2 bg-zinc-700 group-hover:bg-red-500/20 rounded-lg"><Trash2 className="w-5 h-5 text-zinc-400 group-hover:text-red-400" /></div>
          <div><span className="font-medium text-sm group-hover:text-red-400">Delete</span><p className="text-xs text-zinc-500">Remove selected clip</p></div>
        </button>
      </div>
    </div>
  )
}

// ============================================
// Effects Panel (Simplified)
// ============================================
function EffectsPanel() {
  const { addEffect, effects, removeEffect, currentTime, videoDuration } = useEditorStore()
  
  const FILTERS = [
    { id: 'warm', name: 'Warm', css: 'brightness(1.1) saturate(1.2) sepia(0.1)' },
    { id: 'cool', name: 'Cool', css: 'brightness(1.05) saturate(0.9) hue-rotate(-10deg)' },
    { id: 'vintage', name: 'Vintage', css: 'sepia(0.4) contrast(1.1) saturate(0.8)' },
    { id: 'noir', name: 'Noir', css: 'grayscale(1) contrast(1.3)' },
    { id: 'vivid', name: 'Vivid', css: 'saturate(1.5) contrast(1.2)' },
  ]

  const applyFilter = (filter: typeof FILTERS[0]) => {
    effects.filter(e => e.type === 'filter').forEach(e => removeEffect(e.id))
    addEffect({
      id: `filter-${Date.now()}`,
      type: 'filter',
      name: filter.name,
      params: { css: filter.css },
      startTime: 0,
      endTime: videoDuration || 9999
    })
    const video = document.querySelector('video')
    if (video) video.style.filter = filter.css
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-violet-400" />
        <h2 className="text-lg font-semibold">Effects</h2>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {FILTERS.map(filter => (
          <button key={filter.id} onClick={() => applyFilter(filter)} className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-all">
            <div className="w-full aspect-video rounded-lg mb-2 bg-gradient-to-br from-zinc-700 to-zinc-800" />
            <span className="text-xs font-medium">{filter.name}</span>
          </button>
        ))}
        <button onClick={() => { effects.filter(e => e.type === 'filter').forEach(e => removeEffect(e.id)); const video = document.querySelector('video'); if (video) video.style.filter = '' }} className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700">
          <div className="w-full aspect-video rounded-lg mb-2 bg-zinc-700 flex items-center justify-center"><X className="w-6 h-6 text-zinc-500" /></div>
          <span className="text-xs font-medium">None</span>
        </button>
      </div>

      {effects.length > 0 && (
        <div className="pt-4 border-t border-zinc-700">
          <h3 className="text-sm font-medium text-zinc-300 mb-2">Active ({effects.length})</h3>
          <div className="space-y-1">
            {effects.map(effect => (
              <div key={effect.id} className="flex items-center justify-between p-2 bg-zinc-800 rounded-lg text-xs">
                <span className="text-zinc-300">{effect.name}</span>
                <button onClick={() => { removeEffect(effect.id); const video = document.querySelector('video'); if (video) video.style.filter = '' }} className="p-1 hover:bg-red-500/20 rounded text-zinc-400 hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Timeline
// ============================================
function Timeline() {
  const { videoClips, currentTime, setCurrentTime, videoDuration, zoom, setZoom, selectedClipId, setSelectedClipId, setIsPlaying } = useEditorStore()
  const timelineRef = useRef<HTMLDivElement>(null)
  
  const pixelsPerSecond = 50 * zoom
  const timelineWidth = Math.max(videoDuration * pixelsPerSecond, 800)

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft
    setCurrentTime(Math.max(0, Math.min(x / pixelsPerSecond, videoDuration)))
    setIsPlaying(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const timeMarkers = []
  const markerInterval = zoom >= 1.5 ? 1 : zoom >= 0.75 ? 2 : 5
  for (let i = 0; i <= videoDuration; i += markerInterval) timeMarkers.push(i)

  return (
    <div className="h-48 bg-zinc-950 border-t border-zinc-800 flex flex-col shrink-0">
      <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-violet-400" />
          <span className="text-xs text-zinc-500">{formatTime(currentTime)} / {formatTime(videoDuration)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(Math.max(0.25, zoom - 0.25))} className="p-1.5 hover:bg-white/10 rounded"><ZoomOut className="w-4 h-4" /></button>
          <span className="text-xs text-zinc-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(3, zoom + 0.25))} className="p-1.5 hover:bg-white/10 rounded"><ZoomIn className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-32 bg-zinc-900 border-r border-zinc-800 shrink-0">
          <div className="h-6 border-b border-zinc-800" />
          <div className="h-14 border-b border-zinc-800 flex items-center px-2 gap-2">
            <Film className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-zinc-300">Video</span>
          </div>
        </div>

        <div ref={timelineRef} className="flex-1 overflow-x-auto overflow-y-hidden" onClick={handleTimelineClick}>
          <div style={{ width: `${timelineWidth}px`, minHeight: '100%' }} className="relative">
            <div className="h-6 border-b border-zinc-800 relative">
              {timeMarkers.map(time => (
                <div key={time} className="absolute top-0 h-full flex flex-col justify-end pb-1" style={{ left: `${time * pixelsPerSecond}px` }}>
                  <span className="text-[10px] text-zinc-500">{formatTime(time)}</span>
                </div>
              ))}
            </div>

            <div className="h-14 border-b border-zinc-800 relative">
              {videoClips.map(clip => (
                <div
                  key={clip.id}
                  className={`absolute top-1 bottom-1 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 cursor-pointer ${selectedClipId === clip.id ? 'ring-2 ring-white' : ''}`}
                  style={{ left: `${clip.startTime * pixelsPerSecond}px`, width: `${(clip.endTime - clip.startTime) * pixelsPerSecond}px` }}
                  onClick={(e) => { e.stopPropagation(); setSelectedClipId(clip.id) }}
                >
                  <div className="h-full px-3 flex items-center"><span className="text-xs text-white truncate font-medium">{clip.name}</span></div>
                </div>
              ))}
            </div>

            <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none" style={{ left: `${currentTime * pixelsPerSecond}px` }}>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rotate-45" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Voice Command Bar
// ============================================
function VoiceCommandBar() {
  const { 
    jobId, setIsPlaying, isPlaying, setCurrentTime, currentTime, videoDuration,
    setPlaybackRate, playbackRate, setVolume, setProcessing, setProcessingProgress,
    setVideoUrl, isListening, setIsListening
  } = useEditorStore()
  
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const recognitionRef = useRef<any>(null)

  const showFeedback = (message: string, type: 'success' | 'error' | 'info') => {
    setFeedback({ message, type })
    setTimeout(() => setFeedback(null), 3000)
  }

  const executeCommand = async (command: string) => {
    const cmd = command.toLowerCase().trim()
    
    // Playback commands
    if (cmd.includes('play')) { setIsPlaying(true); showFeedback('Playing video', 'success'); return }
    if (cmd.includes('pause') || cmd.includes('stop')) { setIsPlaying(false); showFeedback('Paused video', 'success'); return }
    if (cmd.includes('mute')) { setVolume(0); showFeedback('Muted', 'success'); return }
    if (cmd.includes('unmute')) { setVolume(1); showFeedback('Unmuted', 'success'); return }
    
    // Speed commands
    const speedMatch = cmd.match(/speed\s*(?:to|=)?\s*([\d.]+)/)
    if (speedMatch) { setPlaybackRate(parseFloat(speedMatch[1])); showFeedback(`Speed: ${speedMatch[1]}x`, 'success'); return }
    if (cmd.includes('faster') || cmd.includes('speed up')) { setPlaybackRate(Math.min(4, playbackRate + 0.25)); showFeedback(`Speed: ${playbackRate + 0.25}x`, 'success'); return }
    if (cmd.includes('slower') || cmd.includes('slow down')) { setPlaybackRate(Math.max(0.25, playbackRate - 0.25)); showFeedback(`Speed: ${playbackRate - 0.25}x`, 'success'); return }
    
    // Seek commands
    const seekMatch = cmd.match(/(?:go|seek|jump)\s*(?:to)?\s*(\d+)\s*(?:seconds?)?/)
    if (seekMatch) { setCurrentTime(parseInt(seekMatch[1])); showFeedback(`Jumped to ${seekMatch[1]}s`, 'success'); return }
    if (cmd.includes('beginning') || cmd.includes('start')) { setCurrentTime(0); showFeedback('Start of video', 'success'); return }
    if (cmd.includes('end')) { setCurrentTime(videoDuration); showFeedback('End of video', 'success'); return }
    if (cmd.includes('forward') || cmd.includes('skip')) { setCurrentTime(Math.min(videoDuration, currentTime + 5)); showFeedback('+5 seconds', 'success'); return }
    if (cmd.includes('back') || cmd.includes('rewind')) { setCurrentTime(Math.max(0, currentTime - 5)); showFeedback('-5 seconds', 'success'); return }
    
    // AI commands (require backend)
    if (!jobId) { showFeedback('Upload a video first', 'error'); return }
    
    if (cmd.includes('remove silence') || cmd.includes('cut silence')) {
      showFeedback('Removing silence...', 'info')
      setProcessing(true, 'Removing silence...')
      try {
        await removeSilence(jobId)
        await pollJobStatus(jobId, (p, s) => { setProcessingProgress(p); setProcessing(true, `Removing silence: ${s} (${p}%)`) })
        setVideoUrl(getProcessedStreamUrl(jobId))
        showFeedback('Silence removed!', 'success')
      } catch { showFeedback('Failed to remove silence', 'error') }
      finally { setProcessing(false) }
      return
    }
    
    if (cmd.includes('stabilize') || cmd.includes('steady')) {
      showFeedback('Stabilizing...', 'info')
      setProcessing(true, 'Stabilizing video...')
      try {
        await stabilizeVideo(jobId)
        await pollJobStatus(jobId, (p, s) => { setProcessingProgress(p); setProcessing(true, `Stabilizing: ${s} (${p}%)`) })
        setVideoUrl(getProcessedStreamUrl(jobId))
        showFeedback('Video stabilized!', 'success')
      } catch { showFeedback('Failed to stabilize', 'error') }
      finally { setProcessing(false) }
      return
    }
    
    if (cmd.includes('denoise') || cmd.includes('remove noise')) {
      showFeedback('Removing noise...', 'info')
      setProcessing(true, 'Denoising audio...')
      try {
        await denoiseAudio(jobId)
        await pollJobStatus(jobId, (p, s) => { setProcessingProgress(p); setProcessing(true, `Denoising: ${s} (${p}%)`) })
        setVideoUrl(getProcessedStreamUrl(jobId))
        showFeedback('Audio denoised!', 'success')
      } catch { showFeedback('Failed to denoise', 'error') }
      finally { setProcessing(false) }
      return
    }
    
    if (cmd.includes('caption') || cmd.includes('subtitle')) {
      showFeedback('Generating captions...', 'info')
      setProcessing(true, 'Generating captions...')
      try {
        await generateCaptions(jobId)
        await pollJobStatus(jobId, (p, s) => { setProcessingProgress(p); setProcessing(true, `Captions: ${s} (${p}%)`) })
        showFeedback('Captions generated!', 'success')
      } catch { showFeedback('Failed to generate captions', 'error') }
      finally { setProcessing(false) }
      return
    }
    
    if (cmd.includes('enhance') || cmd.includes('auto enhance')) {
      showFeedback('Auto enhancing...', 'info')
      setProcessing(true, 'Auto enhancing...')
      try {
        await autoEnhance(jobId)
        await pollJobStatus(jobId, (p, s) => { setProcessingProgress(p); setProcessing(true, `Enhancing: ${s} (${p}%)`) })
        setVideoUrl(getProcessedStreamUrl(jobId))
        showFeedback('Video enhanced!', 'success')
      } catch { showFeedback('Failed to enhance', 'error') }
      finally { setProcessing(false) }
      return
    }
    
    if (cmd.includes('color correct') || cmd.includes('fix colors')) {
      showFeedback('Color correcting...', 'info')
      setProcessing(true, 'Color correcting...')
      try {
        await colorCorrect(jobId)
        await pollJobStatus(jobId, (p, s) => { setProcessingProgress(p); setProcessing(true, `Color: ${s} (${p}%)`) })
        setVideoUrl(getProcessedStreamUrl(jobId))
        showFeedback('Colors corrected!', 'success')
      } catch { showFeedback('Failed to color correct', 'error') }
      finally { setProcessing(false) }
      return
    }
    
    showFeedback('Command not recognized', 'error')
  }

  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showFeedback('Speech recognition not supported', 'error')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) finalTranscript += result[0].transcript
        else interimTranscript += result[0].transcript
      }
      setTranscript(interimTranscript || finalTranscript)
      if (finalTranscript) executeCommand(finalTranscript)
    }

    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => { setIsListening(false); showFeedback('Speech recognition error', 'error') }
    
    recognition.start()
    setIsListening(true)
    showFeedback('Listening...', 'info')
  }

  return (
    <div className="fixed bottom-52 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">
      {feedback && (
        <div className={`px-4 py-2 rounded-full text-sm font-medium ${
          feedback.type === 'success' ? 'bg-green-500/20 text-green-400' :
          feedback.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
        }`}>
          {feedback.message}
        </div>
      )}
      
      {transcript && isListening && (
        <div className="px-4 py-2 bg-zinc-800/90 backdrop-blur-sm rounded-full text-sm text-zinc-300 max-w-md truncate">
          {transcript}
        </div>
      )}
      
      <button
        onClick={toggleListening}
        className={`p-4 rounded-full transition-all ${
          isListening 
            ? 'bg-red-500 hover:bg-red-600 ring-4 ring-red-500/30 animate-pulse' 
            : 'bg-violet-600 hover:bg-violet-700'
        }`}
      >
        {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
      </button>
      
      <span className="text-xs text-zinc-500">
        {isListening ? 'Click to stop' : 'Voice commands'}
      </span>
    </div>
  )
}

// ============================================
// Main Editor
// ============================================
export default function VoxCutEditor() {
  const { videoUrl, setVideoFile, setVideoUrl, setJobId, jobId, activePanel, setActivePanel, isProcessing, addVideoClip, setVideoDuration, showWelcome, setShowWelcome } = useEditorStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    isBackendAvailable().then(available => setBackendStatus(available ? 'connected' : 'disconnected'))
  }, [])

  const handleFileSelect = async (file: File) => {
    if (!file || !file.type.startsWith('video/')) return
    setVideoFile(file)
    setIsUploading(true)
    setShowWelcome(false)
    
    const localUrl = URL.createObjectURL(file)
    setVideoUrl(localUrl)
    
    const video = document.createElement('video')
    video.src = localUrl
    video.onloadedmetadata = () => {
      setVideoDuration(video.duration)
      addVideoClip({ id: `clip-${Date.now()}`, name: file.name, src: localUrl, duration: video.duration, startTime: 0, endTime: video.duration, trackIndex: 0 })
    }
    
    try {
      const job = await uploadVideo(file)
      setJobId(job.job_id)
      setVideoUrl(getStreamUrl(job.job_id))
      setBackendStatus('connected')
    } catch {
      setBackendStatus('disconnected')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files[0])
  }

  const toolbarItems = [
    { id: 'tools' as const, icon: Layers, label: 'Edit' },
    { id: 'effects' as const, icon: Sparkles, label: 'Effects' },
    { id: 'ai' as const, icon: Wand2, label: 'AI' },
    { id: 'captions' as const, icon: Subtitles, label: 'Captions' },
    { id: 'voiceover' as const, icon: Mic, label: 'Voice' },
  ]

  return (
    <div className="h-screen w-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
      <WelcomeDialog />
      {isProcessing && <ProcessingOverlay />}
      
      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-zinc-900 rounded-2xl max-w-lg w-full border border-zinc-800 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Voice Commands</h2>
              <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-zinc-800 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-800 p-3 rounded-lg"><span className="text-violet-400">"play"</span> - Play video</div>
                <div className="bg-zinc-800 p-3 rounded-lg"><span className="text-violet-400">"pause"</span> - Pause video</div>
                <div className="bg-zinc-800 p-3 rounded-lg"><span className="text-violet-400">"remove silence"</span> - Cut silent parts</div>
                <div className="bg-zinc-800 p-3 rounded-lg"><span className="text-violet-400">"stabilize"</span> - Fix shaky video</div>
                <div className="bg-zinc-800 p-3 rounded-lg"><span className="text-violet-400">"denoise"</span> - Clean audio</div>
                <div className="bg-zinc-800 p-3 rounded-lg"><span className="text-violet-400">"captions"</span> - Generate subtitles</div>
                <div className="bg-zinc-800 p-3 rounded-lg"><span className="text-violet-400">"enhance"</span> - Auto-improve all</div>
                <div className="bg-zinc-800 p-3 rounded-lg"><span className="text-violet-400">"color correct"</span> - Fix colors</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <header className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowWelcome(true)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="p-1.5 bg-violet-600 rounded-lg">
              <Film className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg">VoxCut</span>
          </button>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-500 text-sm">AI Video Editor</span>
          {backendStatus === 'connected' && <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />Connected</span>}
          {backendStatus === 'disconnected' && <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded-full">Offline</span>}
          {backendStatus === 'checking' && <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded-full flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Checking...</span>}
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHelp(true)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors" title="Help">
            <HelpCircle className="w-5 h-5" />
          </button>
          {videoUrl && jobId && (
            <a href={getDownloadUrl(jobId)} target="_blank" className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              <Download className="w-4 h-4" />Export
            </a>
          )}
          <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors">
            {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading...</> : <><Upload className="w-4 h-4" />Import</>}
          </button>
          <input ref={fileInputRef} type="file" accept="video/*" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} className="hidden" />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-16 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-3 gap-1 shrink-0">
          {toolbarItems.map((item) => (
            <button key={item.id} onClick={() => setActivePanel(item.id)} className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${activePanel === item.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          ))}
        </aside>

        <aside className="w-80 bg-zinc-900/50 border-r border-zinc-800 shrink-0 overflow-y-auto">
          {activePanel === 'tools' && <ToolbarPanel />}
          {activePanel === 'effects' && <EffectsPanel />}
          {activePanel === 'ai' && <AIEnhancePanel />}
          {activePanel === 'captions' && <CaptionsPanel />}
          {activePanel === 'voiceover' && <VoiceoverPanel />}
        </aside>

        <main className="flex-1 flex flex-col min-w-0 bg-zinc-950">
          {!videoUrl ? (
            <div className={`flex-1 flex items-center justify-center transition-colors ${isDragging ? 'bg-violet-600/5' : ''}`} onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }} onDragLeave={() => setIsDragging(false)}>
              <div className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-6 cursor-pointer transition-all ${isDragging ? 'border-violet-500 bg-violet-500/5 scale-105' : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/50'}`} onClick={() => fileInputRef.current?.click()}>
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-600/20 to-purple-600/20 flex items-center justify-center border border-violet-500/20">
                  <Upload className="w-12 h-12 text-violet-400" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-medium text-zinc-200 mb-2">Drop your video here</p>
                  <p className="text-sm text-zinc-500">or click to browse</p>
                  <p className="text-xs text-zinc-600 mt-4">Supports MP4, MOV, AVI, WebM up to 2GB</p>
                </div>
              </div>
            </div>
          ) : (
            <VideoPreview />
          )}
        </main>
      </div>

      <Timeline />
      
      {videoUrl && <VoiceCommandBar />}
    </div>
  )
}
