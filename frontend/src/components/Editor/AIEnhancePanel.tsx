import { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import axios from 'axios'
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
  ChevronRight
} from 'lucide-react'

interface AITool {
  id: string
  name: string
  description: string
  icon: typeof Wand2
  category: 'enhance' | 'audio' | 'edit' | 'generate'
}

const AI_TOOLS: AITool[] = [
  {
    id: 'remove-silence',
    name: 'Remove Silence',
    description: 'Automatically detect and remove silent parts',
    icon: Volume2,
    category: 'audio'
  },
  {
    id: 'auto-captions',
    name: 'Auto Captions',
    description: 'Generate captions using AI speech recognition',
    icon: Subtitles,
    category: 'generate'
  },
  {
    id: 'stabilize',
    name: 'Stabilize Video',
    description: 'Reduce camera shake and jitter',
    icon: VideoIcon,
    category: 'enhance'
  },
  {
    id: 'denoise-audio',
    name: 'Denoise Audio',
    description: 'Remove background noise from audio',
    icon: Volume2,
    category: 'audio'
  },
  {
    id: 'color-correct',
    name: 'Auto Color',
    description: 'Automatically adjust colors and exposure',
    icon: Palette,
    category: 'enhance'
  },
  {
    id: 'smart-cut',
    name: 'Smart Cut',
    description: 'AI-powered jump cut detection',
    icon: Scissors,
    category: 'edit'
  },
  {
    id: 'scene-detect',
    name: 'Scene Detection',
    description: 'Automatically detect scene changes',
    icon: Zap,
    category: 'edit'
  },
  {
    id: 'speed-ramp',
    name: 'Speed Ramp',
    description: 'Create smooth speed transitions',
    icon: Clock,
    category: 'edit'
  },
]

const API_BASE = 'http://localhost:8000'

export function AIEnhancePanel() {
  const { 
    videoFile, 
    setProcessing, 
    setProcessingProgress,
    videoUrl
  } = useEditorStore()

  const [activeTask, setActiveTask] = useState<string | null>(null)
  const [taskStatus, setTaskStatus] = useState<Record<string, 'idle' | 'processing' | 'done' | 'error'>>({})
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'enhance' | 'audio' | 'edit' | 'generate'>('all')

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

  const runAITool = async (toolId: string) => {
    if (!videoFile) {
      alert('Please upload a video first')
      return
    }

    setActiveTask(toolId)
    setTaskStatus(prev => ({ ...prev, [toolId]: 'processing' }))
    setProcessing(true, `Running ${AI_TOOLS.find(t => t.id === toolId)?.name}...`)

    try {
      // Create form data for upload
      const formData = new FormData()
      formData.append('video', videoFile)

      let endpoint = ''
      switch (toolId) {
        case 'remove-silence':
          endpoint = '/process/remove-silence'
          break
        case 'auto-captions':
          endpoint = '/process/captions'
          break
        case 'stabilize':
          endpoint = '/process/stabilize'
          break
        case 'denoise-audio':
          endpoint = '/process/denoise'
          break
        case 'color-correct':
          endpoint = '/process/color-correct'
          break
        case 'smart-cut':
          endpoint = '/process/smart-cut'
          break
        case 'scene-detect':
          endpoint = '/process/scene-detect'
          break
        case 'speed-ramp':
          endpoint = '/process/speed-ramp'
          break
        default:
          throw new Error('Unknown tool')
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProcessingProgress((prev: number) => Math.min(prev + 10, 90))
      }, 500)

      // For now, simulate the API call
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      clearInterval(progressInterval)
      setProcessingProgress(100)
      setTaskStatus(prev => ({ ...prev, [toolId]: 'done' }))

      // In production, make the actual API call:
      // const response = await axios.post(`${API_BASE}${endpoint}`, formData, {
      //   onUploadProgress: (progressEvent) => {
      //     const progress = progressEvent.loaded / (progressEvent.total || 1) * 50
      //     setProcessingProgress(progress)
      //   }
      // })

    } catch (error) {
      console.error('AI tool error:', error)
      setTaskStatus(prev => ({ ...prev, [toolId]: 'error' }))
    } finally {
      setProcessing(false)
      setActiveTask(null)
      
      // Reset status after a delay
      setTimeout(() => {
        setTaskStatus(prev => ({ ...prev, [toolId]: 'idle' }))
      }, 3000)
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

      {/* No Video Warning */}
      {!videoFile && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
          Upload a video to use AI tools
        </div>
      )}

      {/* Tools List */}
      <div className="space-y-2">
        {filteredTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => runAITool(tool.id)}
            disabled={activeTask !== null || !videoFile}
            className={`w-full p-3 rounded-xl text-left transition-all group ${
              activeTask === tool.id
                ? 'bg-violet-600/20 border border-violet-500/30'
                : 'bg-[#1a1a24] hover:bg-[#252532] border border-transparent'
            } ${!videoFile ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          onClick={() => {
            // Run multiple tools
            runAITool('remove-silence')
          }}
          disabled={!videoFile || activeTask !== null}
          className="w-full p-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5" />
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
