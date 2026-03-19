import { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import * as api from '../../services/api'
import {
  Wand2,
  Sparkles,
  Volume2,
  VideoIcon,
  Subtitles,
  Palette,
  Zap,
  Scissors,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  RefreshCw
} from 'lucide-react'

interface AITool {
  id: string
  name: string
  description: string
  icon: typeof Wand2
  category: 'enhance' | 'audio' | 'edit' | 'generate'
  endpoint: string
}

const AI_TOOLS: AITool[] = [
  {
    id: 'remove-silence',
    name: 'Remove Silence',
    description: 'Automatically detect and remove silent parts',
    icon: Volume2,
    category: 'audio',
    endpoint: 'remove-silence'
  },
  {
    id: 'auto-captions',
    name: 'Auto Captions',
    description: 'Generate captions using AI speech recognition',
    icon: Subtitles,
    category: 'generate',
    endpoint: 'captions'
  },
  {
    id: 'stabilize',
    name: 'Stabilize Video',
    description: 'Reduce camera shake and jitter',
    icon: VideoIcon,
    category: 'enhance',
    endpoint: 'stabilize'
  },
  {
    id: 'denoise-audio',
    name: 'Denoise Audio',
    description: 'Remove background noise from audio',
    icon: Volume2,
    category: 'audio',
    endpoint: 'denoise'
  },
  {
    id: 'color-correct',
    name: 'Auto Color',
    description: 'Automatically adjust colors and exposure',
    icon: Palette,
    category: 'enhance',
    endpoint: 'color-correct'
  },
  {
    id: 'scene-detect',
    name: 'Scene Detection',
    description: 'Automatically detect scene changes',
    icon: Zap,
    category: 'edit',
    endpoint: 'scene-detect'
  },
  {
    id: 'smart-cut',
    name: 'Smart Cut',
    description: 'AI-powered jump cut detection',
    icon: Scissors,
    category: 'edit',
    endpoint: 'remove-silence'
  },
  {
    id: 'speed-ramp',
    name: 'Speed Ramp',
    description: 'Create smooth speed transitions',
    icon: Clock,
    category: 'edit',
    endpoint: 'scene-detect'
  },
]

export function AIEnhancePanel() {
  const { 
    jobId,
    videoFile, 
    setProcessing, 
    setProcessingProgress,
    setVideoUrl
  } = useEditorStore()

  const [activeTask, setActiveTask] = useState<string | null>(null)
  const [taskStatus, setTaskStatus] = useState<Record<string, 'idle' | 'processing' | 'done' | 'error'>>({})
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'enhance' | 'audio' | 'edit' | 'generate'>('all')
  const [results, setResults] = useState<Record<string, unknown>>({})

  const categories = [
    { id: 'all', label: 'All Tools' },
    { id: 'enhance', label: 'Enhance' },
    { id: 'audio', label: 'Audio' },
    { id: 'edit', label: 'Edit' },
    { id: 'generate', label: 'Generate' },
  ]

  const filteredTools = selectedCategory === 'all' 
    ? AI_TOOLS 
    : AI_TOOLS.filter(t => t.category === selectedCategory)

  const runAITool = async (tool: AITool) => {
    if (!jobId) {
      alert('Please upload a video first')
      return
    }

    setActiveTask(tool.id)
    setTaskStatus(prev => ({ ...prev, [tool.id]: 'processing' }))
    setProcessing(true, `Running ${tool.name}...`)
    setProcessingProgress(0)

    try {
      let response: api.ProcessingResult

      // Call the appropriate API endpoint
      switch (tool.endpoint) {
        case 'remove-silence':
          response = await api.removeSilence(jobId)
          break
        case 'stabilize':
          response = await api.stabilizeVideo(jobId)
          break
        case 'denoise':
          response = await api.denoiseAudio(jobId)
          break
        case 'captions':
          response = await api.generateCaptions(jobId)
          break
        case 'scene-detect':
          response = await api.detectScenes(jobId)
          break
        case 'color-correct':
          response = await api.colorCorrect(jobId)
          break
        default:
          throw new Error('Unknown tool')
      }

      // Poll for completion
      const job = await api.pollJobStatus(
        jobId,
        (progress, status) => {
          setProcessingProgress(progress)
          setProcessing(true, `${tool.name}: ${status} (${progress}%)`)
        }
      )
      
      // Update video URL if there's a processed file
      if (job.processed_file) {
        setVideoUrl(api.getProcessedStreamUrl(jobId))
      }
      
      // Store results
      setResults(prev => ({ ...prev, [tool.id]: job.results }))
      setTaskStatus(prev => ({ ...prev, [tool.id]: 'done' }))

    } catch (error) {
      console.error('AI tool error:', error)
      setTaskStatus(prev => ({ ...prev, [tool.id]: 'error' }))
    } finally {
      setProcessing(false)
      setActiveTask(null)
      
      // Reset status after a delay
      setTimeout(() => {
        setTaskStatus(prev => ({ ...prev, [tool.id]: 'idle' }))
      }, 5000)
    }
  }

  const runAutoEnhance = async () => {
    if (!jobId) {
      alert('Please upload a video first')
      return
    }

    setActiveTask('auto-enhance')
    setProcessing(true, 'Running Auto Enhance...')
    setProcessingProgress(0)

    try {
      await api.autoEnhance(jobId, {
        remove_silence: true,
        stabilize: true,
        denoise: true,
        color_correct: true
      })

      // Poll for completion
      await api.pollJobStatus(
        jobId,
        (progress, status) => {
          setProcessingProgress(progress)
          setProcessing(true, `Auto Enhance: ${status} (${progress}%)`)
        }
      )

      setVideoUrl(api.getProcessedStreamUrl(jobId))
      setTaskStatus(prev => ({ ...prev, 'auto-enhance': 'done' }))

    } catch (error) {
      console.error('Auto enhance error:', error)
    } finally {
      setProcessing(false)
      setActiveTask(null)
    }
  }

  const getStatusIcon = (toolId: string) => {
    const status = taskStatus[toolId]
    switch (status) {
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
      case 'done':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />
      default:
        return <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Wand2 className="w-5 h-5 text-violet-400" />
        <h2 className="text-lg font-semibold">AI Tools</h2>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 p-1 bg-[#1a1a24] rounded-lg overflow-x-auto">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id as typeof selectedCategory)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? 'bg-violet-600 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Status Messages */}
      {!videoFile && !jobId && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
          Upload a video to use AI tools
        </div>
      )}

      {videoFile && !jobId && (
        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-400 text-sm">
          <p className="font-medium">Backend not connected</p>
          <p className="text-xs mt-1 text-orange-300/70">
            Start the backend server to enable AI features:
          </p>
          <code className="text-xs block mt-2 bg-black/30 p-2 rounded font-mono">
            cd backend && python -m uvicorn main:app --reload --port 8000
          </code>
        </div>
      )}

      {/* Connected Status */}
      {jobId && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Connected to backend - AI tools ready
        </div>
      )}

      {/* Tools List */}
      <div className="space-y-2">
        {filteredTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => runAITool(tool)}
            disabled={activeTask !== null || !jobId}
            className={`w-full p-3 rounded-xl text-left transition-all group ${
              activeTask === tool.id
                ? 'bg-violet-600/20 border border-violet-500/30'
                : 'bg-[#1a1a24] hover:bg-[#252532] border border-transparent'
            } ${!jobId ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                activeTask === tool.id ? 'bg-violet-500/30' : 'bg-[#252532]'
              }`}>
                <tool.icon className={`w-5 h-5 ${
                  activeTask === tool.id ? 'text-violet-400' : 'text-zinc-400'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{tool.name}</span>
                  {getStatusIcon(tool.id)}
                </div>
                <p className="text-xs text-zinc-500 truncate mt-0.5">
                  {tool.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="pt-4 border-t border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Quick Enhance</h3>
        <button
          onClick={runAutoEnhance}
          disabled={!jobId || activeTask !== null}
          className="w-full p-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-center gap-2">
            {activeTask === 'auto-enhance' ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            <span className="font-semibold">Auto Enhance All</span>
          </div>
          <p className="text-xs text-white/70 mt-1">
            Remove silence, stabilize, denoise, and color correct
          </p>
        </button>
      </div>
    </div>
  )
}
