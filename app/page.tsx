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
  X,
  RotateCcw,
  Trash2,
  Plus,
  ChevronRight,
  Clock,
  Sun,
  Contrast,
  Palette,
  HelpCircle
} from 'lucide-react'

// ============================================
// Types
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

interface Caption {
  id: number
  start: number
  end: number
  text: string
}

interface EditorState {
  videoFile: File | null
  videoUrl: string | null
  videoDuration: number
  isPlaying: boolean
  currentTime: number
  volume: number
  playbackRate: number
  videoClips: VideoClip[]
  zoom: number
  selectedClipId: string | null
  activePanel: 'tools' | 'effects' | 'ai' | 'captions'
  isProcessing: boolean
  processingProgress: number
  processingMessage: string
  isListening: boolean
  showWelcome: boolean
  captions: Caption[]
  activeFilter: string
  brightness: number
  contrast: number
  saturation: number
  
  setVideoFile: (file: File | null) => void
  setVideoUrl: (url: string | null) => void
  setVideoDuration: (duration: number) => void
  setIsPlaying: (playing: boolean) => void
  setCurrentTime: (time: number) => void
  setVolume: (volume: number) => void
  setPlaybackRate: (rate: number) => void
  addVideoClip: (clip: VideoClip) => void
  updateVideoClip: (id: string, updates: Partial<VideoClip>) => void
  removeVideoClip: (id: string) => void
  setZoom: (zoom: number) => void
  setSelectedClipId: (id: string | null) => void
  setActivePanel: (panel: EditorState['activePanel']) => void
  setProcessing: (isProcessing: boolean, message?: string) => void
  setProcessingProgress: (progress: number) => void
  setIsListening: (listening: boolean) => void
  setShowWelcome: (show: boolean) => void
  setCaptions: (captions: Caption[]) => void
  addCaption: (caption: Caption) => void
  updateCaption: (id: number, updates: Partial<Caption>) => void
  removeCaption: (id: number) => void
  setActiveFilter: (filter: string) => void
  setBrightness: (brightness: number) => void
  setContrast: (contrast: number) => void
  setSaturation: (saturation: number) => void
}

const useEditorStore = create<EditorState>((set) => ({
  videoFile: null,
  videoUrl: null,
  videoDuration: 0,
  isPlaying: false,
  currentTime: 0,
  volume: 1,
  playbackRate: 1,
  videoClips: [],
  zoom: 1,
  selectedClipId: null,
  activePanel: 'tools',
  isProcessing: false,
  processingProgress: 0,
  processingMessage: '',
  isListening: false,
  showWelcome: true,
  captions: [],
  activeFilter: 'none',
  brightness: 100,
  contrast: 100,
  saturation: 100,
  
  setVideoFile: (file) => set({ videoFile: file }),
  setVideoUrl: (url) => set({ videoUrl: url }),
  setVideoDuration: (duration) => set({ videoDuration: duration }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setVolume: (volume) => set({ volume }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  addVideoClip: (clip) => set((s) => ({ videoClips: [...s.videoClips, clip] })),
  updateVideoClip: (id, updates) => set((s) => ({
    videoClips: s.videoClips.map((c) => c.id === id ? { ...c, ...updates } : c)
  })),
  removeVideoClip: (id) => set((s) => ({ videoClips: s.videoClips.filter((c) => c.id !== id) })),
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
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setBrightness: (brightness) => set({ brightness }),
  setContrast: (contrast) => set({ contrast }),
  setSaturation: (saturation) => set({ saturation }),
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
              <span className="flex items-center gap-1"><Wand2 className="w-3 h-3" /> Effects</span>
              <span className="flex items-center gap-1"><Mic className="w-3 h-3" /> Voice Control</span>
              <span className="flex items-center gap-1"><Subtitles className="w-3 h-3" /> Captions</span>
              <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> Filters</span>
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
    volume, setVolume, playbackRate, setPlaybackRate, videoDuration, setVideoDuration,
    activeFilter, brightness, contrast, saturation, captions
  } = useEditorStore()
  
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [previewScale, setPreviewScale] = useState(1)

  // Get current caption
  const currentCaption = captions.find(
    c => currentTime >= c.start && currentTime <= c.end
  )

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

  // Build CSS filter string
  const getFilterStyle = () => {
    let filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
    
    switch (activeFilter) {
      case 'grayscale': filter += ' grayscale(100%)'; break
      case 'sepia': filter += ' sepia(80%)'; break
      case 'vintage': filter += ' sepia(30%) contrast(110%) brightness(90%)'; break
      case 'cool': filter += ' hue-rotate(180deg) saturate(70%)'; break
      case 'warm': filter += ' sepia(20%) saturate(140%)'; break
      case 'dramatic': filter += ' contrast(150%) brightness(90%)'; break
      case 'fade': filter += ' contrast(80%) brightness(110%) saturate(80%)'; break
      case 'noir': filter += ' grayscale(100%) contrast(120%)'; break
    }
    
    return filter
  }

  return (
    <div className="flex-1 flex flex-col bg-black relative">
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl" style={{ transform: `scale(${previewScale})` }}>
          <video 
            ref={videoRef} 
            src={videoUrl || ''} 
            className="max-h-[calc(100vh-350px)] max-w-full" 
            style={{ filter: getFilterStyle() }}
            onClick={() => setIsPlaying(!isPlaying)} 
            playsInline 
          />
          
          {/* Caption Overlay */}
          {currentCaption && (
            <div className="absolute bottom-16 left-0 right-0 flex justify-center px-4">
              <div className="bg-black/80 px-4 py-2 rounded-lg max-w-[80%]">
                <p className="text-white text-lg text-center font-medium">{currentCaption.text}</p>
              </div>
            </div>
          )}
          
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
// Effects Panel (Client-side filters)
// ============================================
function EffectsPanel() {
  const { activeFilter, setActiveFilter, brightness, setBrightness, contrast, setContrast, saturation, setSaturation, videoFile } = useEditorStore()
  
  const filters = [
    { id: 'none', name: 'None', preview: 'bg-zinc-700' },
    { id: 'grayscale', name: 'B&W', preview: 'bg-gradient-to-r from-gray-800 to-gray-400' },
    { id: 'sepia', name: 'Sepia', preview: 'bg-gradient-to-r from-amber-900 to-amber-600' },
    { id: 'vintage', name: 'Vintage', preview: 'bg-gradient-to-r from-orange-900 to-yellow-700' },
    { id: 'cool', name: 'Cool', preview: 'bg-gradient-to-r from-cyan-800 to-blue-500' },
    { id: 'warm', name: 'Warm', preview: 'bg-gradient-to-r from-orange-700 to-red-500' },
    { id: 'dramatic', name: 'Dramatic', preview: 'bg-gradient-to-r from-zinc-900 to-zinc-500' },
    { id: 'fade', name: 'Fade', preview: 'bg-gradient-to-r from-zinc-500 to-zinc-300' },
    { id: 'noir', name: 'Noir', preview: 'bg-gradient-to-r from-black to-zinc-600' },
  ]

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-violet-400" />
        <h2 className="text-lg font-semibold">Effects & Filters</h2>
      </div>

      {!videoFile && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
          Upload a video to apply effects
        </div>
      )}

      {videoFile && (
        <>
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Filters</h3>
            <div className="grid grid-cols-3 gap-2">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`p-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                    activeFilter === filter.id 
                      ? 'bg-violet-600/20 ring-2 ring-violet-500' 
                      : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                >
                  <div className={`w-full h-8 rounded ${filter.preview}`} />
                  <span className="text-xs">{filter.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-400">Adjustments</h3>
            
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm flex items-center gap-2">
                    <Sun className="w-4 h-4 text-yellow-400" />
                    Brightness
                  </label>
                  <span className="text-xs text-zinc-500">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="w-full h-2 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:rounded-full"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm flex items-center gap-2">
                    <Contrast className="w-4 h-4 text-blue-400" />
                    Contrast
                  </label>
                  <span className="text-xs text-zinc-500">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value))}
                  className="w-full h-2 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:rounded-full"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm flex items-center gap-2">
                    <Palette className="w-4 h-4 text-pink-400" />
                    Saturation
                  </label>
                  <span className="text-xs text-zinc-500">{saturation}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={saturation}
                  onChange={(e) => setSaturation(parseInt(e.target.value))}
                  className="w-full h-2 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:rounded-full"
                />
              </div>
            </div>

            <button
              onClick={() => {
                setActiveFilter('none')
                setBrightness(100)
                setContrast(100)
                setSaturation(100)
              }}
              className="w-full p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset All
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================
// AI Tools Panel (Client-side processing info)
// ============================================
function AIToolsPanel() {
  const { videoFile, setProcessing, setProcessingProgress } = useEditorStore()
  
  const simulateProcessing = async (name: string, duration: number = 3000) => {
    setProcessing(true, `${name}...`)
    const steps = 20
    for (let i = 0; i <= steps; i++) {
      setProcessingProgress((i / steps) * 100)
      await new Promise(r => setTimeout(r, duration / steps))
    }
    setProcessing(false)
  }

  const tools = [
    { id: 'enhance', name: 'Auto Enhance', description: 'Improve video quality', icon: Wand2 },
    { id: 'stabilize', name: 'Stabilize', description: 'Reduce camera shake', icon: Film },
    { id: 'denoise', name: 'Denoise Audio', description: 'Clean up background noise', icon: Music },
    { id: 'color', name: 'Color Correct', description: 'Auto color grading', icon: Palette },
  ]

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Wand2 className="w-5 h-5 text-violet-400" />
        <h2 className="text-lg font-semibold">AI Tools</h2>
      </div>

      {!videoFile ? (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
          Upload a video to use AI tools
        </div>
      ) : (
        <>
          <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg text-violet-300 text-sm">
            <p className="font-medium mb-1">Client-side Processing</p>
            <p className="text-xs text-violet-400">Effects are applied in real-time using CSS filters. For advanced AI features, a backend server is required.</p>
          </div>

          <div className="space-y-2">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => simulateProcessing(tool.name, 2000)}
                className="w-full p-3 rounded-xl text-left transition-all group bg-zinc-800 hover:bg-zinc-700 border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-700 group-hover:bg-zinc-600">
                    <tool.icon className="w-5 h-5 text-zinc-400 group-hover:text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{tool.name}</span>
                      <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white" />
                    </div>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">{tool.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-zinc-700">
            <button 
              onClick={() => simulateProcessing('Auto Enhancing', 4000)}
              className="w-full p-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-xl"
            >
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">Auto Enhance All</span>
              </div>
              <p className="text-xs text-white/70 mt-1">Apply all improvements at once</p>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================
// Captions Panel
// ============================================
function CaptionsPanel() {
  const { videoFile, currentTime, captions, setCaptions, addCaption, updateCaption, removeCaption, videoDuration } = useEditorStore()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newCaptionText, setNewCaptionText] = useState('')

  const handleAddCaption = () => {
    if (!newCaptionText.trim()) return
    const newId = captions.length > 0 ? Math.max(...captions.map(c => c.id)) + 1 : 1
    addCaption({
      id: newId,
      start: currentTime,
      end: Math.min(currentTime + 3, videoDuration),
      text: newCaptionText.trim()
    })
    setNewCaptionText('')
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

      {!videoFile ? (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
          Upload a video first
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newCaptionText}
                onChange={(e) => setNewCaptionText(e.target.value)}
                placeholder="Enter caption text..."
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCaption()}
              />
              <button
                onClick={handleAddCaption}
                disabled={!newCaptionText.trim()}
                className="p-2 bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-zinc-500">Caption will start at current time: {formatTime(currentTime)}</p>
          </div>

          {captions.length > 0 && (
            <div className="max-h-80 overflow-y-auto space-y-2 mt-4">
              {captions.sort((a, b) => a.start - b.start).map((caption) => (
                <div
                  key={caption.id}
                  className={`p-3 rounded-lg transition-all ${
                    currentTime >= caption.start && currentTime <= caption.end 
                      ? 'bg-violet-600/20 border border-violet-500/30' 
                      : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                    <span>{formatTime(caption.start)} - {formatTime(caption.end)}</span>
                    <button 
                      onClick={() => removeCaption(caption.id)}
                      className="p-1 hover:bg-red-500/20 rounded text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {editingId === caption.id ? (
                    <input
                      type="text"
                      value={caption.text}
                      onChange={(e) => updateCaption(caption.id, { text: e.target.value })}
                      onBlur={() => setEditingId(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                      className="w-full bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-sm"
                      autoFocus
                    />
                  ) : (
                    <p 
                      className="text-sm cursor-pointer hover:text-violet-300"
                      onClick={() => setEditingId(caption.id)}
                    >
                      {caption.text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {captions.length === 0 && (
            <div className="text-center py-8 text-zinc-500">
              <Subtitles className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No captions yet</p>
              <p className="text-xs mt-1">Add captions manually above</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ============================================
// Tools Panel (Clip management)
// ============================================
function ToolsPanel() {
  const { currentTime, videoDuration, videoClips, selectedClipId, updateVideoClip, removeVideoClip, videoFile } = useEditorStore()

  const selectedClip = videoClips.find(c => c.id === selectedClipId)

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-5 h-5 text-violet-400" />
        <h2 className="text-lg font-semibold">Edit Tools</h2>
      </div>

      {!videoFile ? (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
          Upload a video to start editing
        </div>
      ) : (
        <>
          <div className="bg-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-400">Current Position</span>
            </div>
            <div className="text-2xl font-mono font-bold text-white">
              {formatTime(currentTime)}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              of {formatTime(videoDuration)}
            </div>
          </div>

          {selectedClip ? (
            <div className="bg-zinc-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Selected Clip</h3>
                <button 
                  onClick={() => removeVideoClip(selectedClip.id)}
                  className="p-1 hover:bg-red-500/20 rounded text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Start Time</label>
                  <input
                    type="range"
                    min={0}
                    max={videoDuration}
                    step={0.1}
                    value={selectedClip.startTime}
                    onChange={(e) => updateVideoClip(selectedClip.id, { startTime: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-xs text-zinc-400">{formatTime(selectedClip.startTime)}</span>
                </div>
                
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">End Time</label>
                  <input
                    type="range"
                    min={0}
                    max={videoDuration}
                    step={0.1}
                    value={selectedClip.endTime}
                    onChange={(e) => updateVideoClip(selectedClip.id, { endTime: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-xs text-zinc-400">{formatTime(selectedClip.endTime)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-zinc-500 text-sm">
              <Scissors className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Select a clip on the timeline to edit</p>
            </div>
          )}

          <div className="pt-4 border-t border-zinc-700">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <button className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm flex items-center gap-2">
                <Scissors className="w-4 h-4 text-violet-400" />
                Split at cursor
              </button>
              <button className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm flex items-center gap-2">
                <Type className="w-4 h-4 text-violet-400" />
                Add text
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================
// Timeline
// ============================================
function Timeline() {
  const { videoClips, currentTime, setCurrentTime, videoDuration, zoom, setZoom, selectedClipId, setSelectedClipId, captions } = useEditorStore()
  const timelineRef = useRef<HTMLDivElement>(null)

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || videoDuration === 0) return
    const rect = timelineRef.current.getBoundingClientRect()
    const scrollLeft = timelineRef.current.scrollLeft
    const clickX = e.clientX - rect.left + scrollLeft
    const totalWidth = videoDuration * 50 * zoom
    const percentage = clickX / totalWidth
    setCurrentTime(Math.max(0, Math.min(videoDuration, percentage * videoDuration)))
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const timeMarkers = []
  const interval = zoom > 1.5 ? 5 : zoom > 0.75 ? 10 : 30
  for (let i = 0; i <= videoDuration; i += interval) {
    timeMarkers.push(i)
  }

  return (
    <div className="h-48 bg-zinc-900 border-t border-zinc-800 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Timeline</span>
          {videoClips.length > 0 && (
            <span className="text-xs text-zinc-500">{videoClips.length} clip(s)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} className="p-1 hover:bg-zinc-800 rounded">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-zinc-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(3, zoom + 0.25))} className="p-1 hover:bg-zinc-800 rounded">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={timelineRef} className="flex-1 overflow-x-auto overflow-y-hidden relative" onClick={handleTimelineClick}>
        {videoDuration > 0 ? (
          <div className="h-full relative" style={{ width: `${videoDuration * 50 * zoom}px`, minWidth: '100%' }}>
            {/* Time markers */}
            <div className="h-6 border-b border-zinc-800 relative">
              {timeMarkers.map((time) => (
                <div key={time} className="absolute top-0 flex flex-col items-center" style={{ left: `${(time / videoDuration) * 100}%` }}>
                  <div className="w-px h-2 bg-zinc-600" />
                  <span className="text-[10px] text-zinc-500 mt-0.5">{formatTime(time)}</span>
                </div>
              ))}
            </div>

            {/* Video track */}
            <div className="h-16 relative mt-1 px-2">
              {videoClips.map((clip) => (
                <div
                  key={clip.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedClipId(clip.id) }}
                  className={`absolute h-14 rounded-lg cursor-pointer transition-all ${
                    selectedClipId === clip.id 
                      ? 'ring-2 ring-violet-500 bg-violet-600/40' 
                      : 'bg-violet-600/20 hover:bg-violet-600/30'
                  }`}
                  style={{
                    left: `${(clip.startTime / videoDuration) * 100}%`,
                    width: `${((clip.endTime - clip.startTime) / videoDuration) * 100}%`,
                  }}
                >
                  <div className="p-2 h-full flex flex-col justify-between overflow-hidden">
                    <span className="text-xs font-medium truncate">{clip.name}</span>
                    <span className="text-[10px] text-zinc-400">
                      {formatTime(clip.endTime - clip.startTime)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Captions track */}
            {captions.length > 0 && (
              <div className="h-8 relative mt-1 px-2">
                <div className="absolute left-2 top-0 text-[10px] text-zinc-500">Captions</div>
                {captions.map((caption) => (
                  <div
                    key={caption.id}
                    className="absolute h-6 top-0 rounded bg-green-600/30 border border-green-500/30"
                    style={{
                      left: `${(caption.start / videoDuration) * 100}%`,
                      width: `${((caption.end - caption.start) / videoDuration) * 100}%`,
                    }}
                  >
                    <span className="text-[10px] p-1 truncate block">{caption.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Playhead */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
              style={{ left: `${(currentTime / videoDuration) * 100}%` }}
            >
              <div className="w-3 h-3 bg-red-500 rounded-full -ml-[5px] -mt-1" />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
            Upload a video to see the timeline
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Voice Command Bar
// ============================================
function VoiceCommandBar() {
  const { 
    setIsPlaying, isPlaying, setCurrentTime, currentTime, videoDuration,
    setPlaybackRate, playbackRate, setVolume, isListening, setIsListening
  } = useEditorStore()
  
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const showFeedback = (message: string, type: 'success' | 'error' | 'info') => {
    setFeedback({ message, type })
    setTimeout(() => setFeedback(null), 3000)
  }

  const executeCommand = (command: string) => {
    const cmd = command.toLowerCase().trim()
    
    if (cmd.includes('play')) { setIsPlaying(true); showFeedback('Playing video', 'success'); return }
    if (cmd.includes('pause') || cmd.includes('stop')) { setIsPlaying(false); showFeedback('Paused video', 'success'); return }
    if (cmd.includes('mute')) { setVolume(0); showFeedback('Muted', 'success'); return }
    if (cmd.includes('unmute')) { setVolume(1); showFeedback('Unmuted', 'success'); return }
    
    const speedMatch = cmd.match(/speed\s*(?:to|=)?\s*([\d.]+)/)
    if (speedMatch) { setPlaybackRate(parseFloat(speedMatch[1])); showFeedback(`Speed: ${speedMatch[1]}x`, 'success'); return }
    if (cmd.includes('faster') || cmd.includes('speed up')) { setPlaybackRate(Math.min(4, playbackRate + 0.25)); showFeedback(`Speed: ${playbackRate + 0.25}x`, 'success'); return }
    if (cmd.includes('slower') || cmd.includes('slow down')) { setPlaybackRate(Math.max(0.25, playbackRate - 0.25)); showFeedback(`Speed: ${playbackRate - 0.25}x`, 'success'); return }
    
    const seekMatch = cmd.match(/(?:go|seek|jump)\s*(?:to)?\s*(\d+)\s*(?:seconds?)?/)
    if (seekMatch) { setCurrentTime(parseInt(seekMatch[1])); showFeedback(`Jumped to ${seekMatch[1]}s`, 'success'); return }
    if (cmd.includes('beginning') || cmd.includes('start')) { setCurrentTime(0); showFeedback('Start of video', 'success'); return }
    if (cmd.includes('end')) { setCurrentTime(videoDuration); showFeedback('End of video', 'success'); return }
    if (cmd.includes('forward') || cmd.includes('skip')) { setCurrentTime(Math.min(videoDuration, currentTime + 5)); showFeedback('+5 seconds', 'success'); return }
    if (cmd.includes('back') || cmd.includes('rewind')) { setCurrentTime(Math.max(0, currentTime - 5)); showFeedback('-5 seconds', 'success'); return }
    
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

    const SpeechRecognitionAPI = (window as typeof window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition || window.SpeechRecognition
    const recognition = new SpeechRecognitionAPI()
    recognitionRef.current = recognition
    
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
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
  const { videoUrl, setVideoFile, setVideoUrl, activePanel, setActivePanel, isProcessing, addVideoClip, setVideoDuration, showWelcome, setShowWelcome, videoFile } = useEditorStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

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
      addVideoClip({ 
        id: `clip-${Date.now()}`, 
        name: file.name, 
        src: localUrl, 
        duration: video.duration, 
        startTime: 0, 
        endTime: video.duration, 
        trackIndex: 0 
      })
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files[0])
  }

  const handleExport = () => {
    if (!videoUrl || !videoFile) return
    const a = document.createElement('a')
    a.href = videoUrl
    a.download = videoFile.name || 'voxcut-export.mp4'
    a.click()
  }

  const toolbarItems = [
    { id: 'tools' as const, icon: Layers, label: 'Edit' },
    { id: 'effects' as const, icon: Sparkles, label: 'Effects' },
    { id: 'ai' as const, icon: Wand2, label: 'AI' },
    { id: 'captions' as const, icon: Subtitles, label: 'Captions' },
  ]

  return (
    <div className="h-screen w-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
      <WelcomeDialog />
      {isProcessing && <ProcessingOverlay />}
      
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-zinc-900 rounded-2xl max-w-lg w-full border border-zinc-800 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Voice Commands</h2>
              <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-zinc-800 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-800 p-3 rounded-lg"><span className="text-violet-400">&quot;play&quot;</span> - Play video</div>
                <div className="bg-zinc-800 p-3 rounded-lg"><span className="text-violet-400">&quot;pause&quot;</span> - Pause video</div>
                <div className="bg-zinc-800 p-3 rounded-lg"><span className="text-violet-400">&quot;mute&quot;</span> - Mute audio</div>
                <div className="bg-zinc-800 p-3 rounded-lg"><span className="text-violet-400">&quot;speed 2&quot;</span> - Set speed</div>
                <div className="bg-zinc-800 p-3 rounded-lg"><span className="text-violet-400">&quot;go to 30&quot;</span> - Seek to time</div>
                <div className="bg-zinc-800 p-3 rounded-lg"><span className="text-violet-400">&quot;forward&quot;</span> - Skip +5s</div>
                <div className="bg-zinc-800 p-3 rounded-lg"><span className="text-violet-400">&quot;back&quot;</span> - Rewind -5s</div>
                <div className="bg-zinc-800 p-3 rounded-lg"><span className="text-violet-400">&quot;beginning&quot;</span> - Go to start</div>
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
          <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            Client-side
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHelp(true)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors" title="Help">
            <HelpCircle className="w-5 h-5" />
          </button>
          {videoUrl && (
            <button onClick={handleExport} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              <Download className="w-4 h-4" />Export
            </button>
          )}
          <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors">
            {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" />Loading...</> : <><Upload className="w-4 h-4" />Import</>}
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
          {activePanel === 'tools' && <ToolsPanel />}
          {activePanel === 'effects' && <EffectsPanel />}
          {activePanel === 'ai' && <AIToolsPanel />}
          {activePanel === 'captions' && <CaptionsPanel />}
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
                  <p className="text-xs text-zinc-600 mt-4">Supports MP4, MOV, AVI, WebM</p>
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
