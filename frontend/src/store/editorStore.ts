import { create } from 'zustand'

export interface VideoClip {
  id: string
  name: string
  src: string
  duration: number
  startTime: number
  endTime: number
  trackIndex: number
  thumbnails?: string[]
}

export interface AudioClip {
  id: string
  name: string
  src: string
  duration: number
  startTime: number
  endTime: number
  trackIndex: number
  waveform?: number[]
}

export interface TextOverlay {
  id: string
  text: string
  startTime: number
  endTime: number
  position: { x: number; y: number }
  style: {
    fontSize: number
    fontFamily: string
    color: string
    backgroundColor?: string
  }
}

export interface Effect {
  id: string
  type: 'filter' | 'transition' | 'animation'
  name: string
  params: Record<string, unknown>
  startTime: number
  endTime: number
}

export interface EditorState {
  // Project info
  projectId: string | null
  projectName: string
  
  // Video state
  videoFile: File | null
  videoUrl: string | null
  videoDuration: number
  jobId: string | null
  isPlaying: boolean
  currentTime: number
  volume: number
  playbackRate: number
  
  // Timeline state
  videoClips: VideoClip[]
  audioClips: AudioClip[]
  textOverlays: TextOverlay[]
  effects: Effect[]
  
  // UI state
  zoom: number
  selectedClipId: string | null
  activePanel: 'tools' | 'effects' | 'text' | 'audio' | 'ai'
  isProcessing: boolean
  processingProgress: number
  processingMessage: string
  
  // Voice command state
  isListening: boolean
  voiceTranscript: string
  
  // Actions
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
  
  addAudioClip: (clip: AudioClip) => void
  updateAudioClip: (id: string, updates: Partial<AudioClip>) => void
  removeAudioClip: (id: string) => void
  
  addTextOverlay: (overlay: TextOverlay) => void
  updateTextOverlay: (id: string, updates: Partial<TextOverlay>) => void
  removeTextOverlay: (id: string) => void
  
  addEffect: (effect: Effect) => void
  removeEffect: (id: string) => void
  
  setZoom: (zoom: number) => void
  setSelectedClipId: (id: string | null) => void
  setActivePanel: (panel: EditorState['activePanel']) => void
  
  setProcessing: (isProcessing: boolean, message?: string) => void
  setProcessingProgress: (progress: number) => void
  
  setIsListening: (listening: boolean) => void
  setVoiceTranscript: (transcript: string) => void
  
  resetProject: () => void
}

const initialState = {
  projectId: null,
  projectName: 'Untitled Project',
  videoFile: null,
  videoUrl: null,
  videoDuration: 0,
  jobId: null,
  isPlaying: false,
  currentTime: 0,
  volume: 1,
  playbackRate: 1,
  videoClips: [],
  audioClips: [],
  textOverlays: [],
  effects: [],
  zoom: 1,
  selectedClipId: null,
  activePanel: 'tools' as const,
  isProcessing: false,
  processingProgress: 0,
  processingMessage: '',
  isListening: false,
  voiceTranscript: '',
}

export const useEditorStore = create<EditorState>((set) => ({
  ...initialState,
  
  setVideoFile: (file) => set({ videoFile: file }),
  setVideoUrl: (url) => set({ videoUrl: url }),
  setVideoDuration: (duration) => set({ videoDuration: duration }),
  setJobId: (jobId) => set({ jobId }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setVolume: (volume) => set({ volume: volume }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  
  addVideoClip: (clip) => set((state) => ({ 
    videoClips: [...state.videoClips, clip] 
  })),
  updateVideoClip: (id, updates) => set((state) => ({
    videoClips: state.videoClips.map((c) => 
      c.id === id ? { ...c, ...updates } : c
    )
  })),
  removeVideoClip: (id) => set((state) => ({
    videoClips: state.videoClips.filter((c) => c.id !== id)
  })),
  
  addAudioClip: (clip) => set((state) => ({ 
    audioClips: [...state.audioClips, clip] 
  })),
  updateAudioClip: (id, updates) => set((state) => ({
    audioClips: state.audioClips.map((c) => 
      c.id === id ? { ...c, ...updates } : c
    )
  })),
  removeAudioClip: (id) => set((state) => ({
    audioClips: state.audioClips.filter((c) => c.id !== id)
  })),
  
  addTextOverlay: (overlay) => set((state) => ({ 
    textOverlays: [...state.textOverlays, overlay] 
  })),
  updateTextOverlay: (id, updates) => set((state) => ({
    textOverlays: state.textOverlays.map((o) => 
      o.id === id ? { ...o, ...updates } : o
    )
  })),
  removeTextOverlay: (id) => set((state) => ({
    textOverlays: state.textOverlays.filter((o) => o.id !== id)
  })),
  
  addEffect: (effect) => set((state) => ({ 
    effects: [...state.effects, effect] 
  })),
  removeEffect: (id) => set((state) => ({
    effects: state.effects.filter((e) => e.id !== id)
  })),
  
  setZoom: (zoom) => set({ zoom }),
  setSelectedClipId: (id) => set({ selectedClipId: id }),
  setActivePanel: (panel) => set({ activePanel: panel }),
  
  setProcessing: (isProcessing, message = '') => set({ 
    isProcessing, 
    processingMessage: message,
    processingProgress: isProcessing ? 0 : 100
  }),
  setProcessingProgress: (progress) => set({ processingProgress: progress }),
  
  setIsListening: (listening) => set({ isListening: listening }),
  setVoiceTranscript: (transcript) => set({ voiceTranscript: transcript }),
  
  resetProject: () => set(initialState),
}))
