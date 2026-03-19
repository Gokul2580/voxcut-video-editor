import { useState, useEffect, useRef } from 'react'
import { useEditorStore } from '../../store/editorStore'
import * as api from '../../services/api'
import {
  Subtitles,
  Plus,
  Trash2,
  Play,
  Pause,
  Upload,
  Download,
  Wand2,
  Edit2,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Clock,
  Type as TypeIcon,
  Loader2,
  Languages
} from 'lucide-react'

interface Caption {
  id: string
  startTime: number
  endTime: number
  text: string
}

interface CaptionStyle {
  fontSize: number
  fontFamily: string
  color: string
  backgroundColor: string
  position: 'bottom' | 'top' | 'center'
  outline: boolean
}

const CAPTION_STYLES: { id: string; name: string; style: CaptionStyle }[] = [
  {
    id: 'default',
    name: 'Default',
    style: {
      fontSize: 24,
      fontFamily: 'Inter',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.7)',
      position: 'bottom',
      outline: false
    }
  },
  {
    id: 'netflix',
    name: 'Netflix',
    style: {
      fontSize: 28,
      fontFamily: 'Arial',
      color: '#ffffff',
      backgroundColor: 'transparent',
      position: 'bottom',
      outline: true
    }
  },
  {
    id: 'youtube',
    name: 'YouTube',
    style: {
      fontSize: 22,
      fontFamily: 'Roboto',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.8)',
      position: 'bottom',
      outline: false
    }
  },
  {
    id: 'karaoke',
    name: 'Karaoke',
    style: {
      fontSize: 32,
      fontFamily: 'Impact',
      color: '#ffff00',
      backgroundColor: 'transparent',
      position: 'center',
      outline: true
    }
  },
  {
    id: 'minimal',
    name: 'Minimal',
    style: {
      fontSize: 20,
      fontFamily: 'Inter',
      color: '#ffffff',
      backgroundColor: 'transparent',
      position: 'bottom',
      outline: false
    }
  }
]

export function CaptionsEditor() {
  const {
    jobId,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    videoDuration,
    setProcessing,
    setProcessingProgress
  } = useEditorStore()

  const [captions, setCaptions] = useState<Caption[]>([])
  const [selectedCaption, setSelectedCaption] = useState<string | null>(null)
  const [editingCaption, setEditingCaption] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(CAPTION_STYLES[0].style)
  const [activeStylePreset, setActiveStylePreset] = useState('default')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get current caption
  const currentCaption = captions.find(
    c => currentTime >= c.startTime && currentTime <= c.endTime
  )

  // Auto-scroll to current caption
  useEffect(() => {
    if (currentCaption && !editingCaption) {
      setSelectedCaption(currentCaption.id)
      const element = document.getElementById(`caption-${currentCaption.id}`)
      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentCaption, editingCaption])

  // Generate captions using AI
  const handleGenerateCaptions = async () => {
    if (!jobId) return

    setIsGenerating(true)
    setProcessing(true, 'Generating captions with AI...')

    try {
      await api.generateCaptions(jobId)
      const result = await api.pollJobStatus(jobId, (progress, status) => {
        setProcessingProgress(progress)
      })

      // Parse captions from result - check metadata
      const metadata = result.metadata as any
      if (metadata?.captions) {
        const newCaptions = (metadata.captions as any[]).map((c, i) => ({
          id: `caption-${i}`,
          startTime: c.start,
          endTime: c.end,
          text: c.text
        }))
        setCaptions(newCaptions)
      } else {
        // Try to fetch captions from API
        const captionsResult = await api.getCaptions(jobId)
        if (captionsResult.captions && captionsResult.captions.length > 0) {
          const newCaptions = captionsResult.captions.map((c, i) => ({
            id: `caption-${i}`,
            startTime: c.start,
            endTime: c.end,
            text: c.text
          }))
          setCaptions(newCaptions)
        }
      }
    } catch (error) {
      console.error('Failed to generate captions:', error)
    } finally {
      setIsGenerating(false)
      setProcessing(false)
    }
  }

  // Add new caption
  const handleAddCaption = () => {
    const newCaption: Caption = {
      id: `caption-${Date.now()}`,
      startTime: currentTime,
      endTime: Math.min(currentTime + 3, videoDuration),
      text: 'New caption'
    }
    setCaptions([...captions, newCaption].sort((a, b) => a.startTime - b.startTime))
    setSelectedCaption(newCaption.id)
    setEditingCaption(newCaption.id)
    setEditText(newCaption.text)
  }

  // Delete caption
  const handleDeleteCaption = (id: string) => {
    setCaptions(captions.filter(c => c.id !== id))
    if (selectedCaption === id) setSelectedCaption(null)
    if (editingCaption === id) setEditingCaption(null)
  }

  // Update caption
  const handleUpdateCaption = (id: string, updates: Partial<Caption>) => {
    setCaptions(captions.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ).sort((a, b) => a.startTime - b.startTime))
  }

  // Start editing caption
  const handleStartEdit = (caption: Caption) => {
    setEditingCaption(caption.id)
    setEditText(caption.text)
  }

  // Save edit
  const handleSaveEdit = () => {
    if (editingCaption) {
      handleUpdateCaption(editingCaption, { text: editText })
      setEditingCaption(null)
    }
  }

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingCaption(null)
    setEditText('')
  }

  // Jump to caption time
  const handleJumpToCaption = (caption: Caption) => {
    setCurrentTime(caption.startTime)
    setSelectedCaption(caption.id)
  }

  // Import SRT file
  const handleImportSRT = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      const parsed = parseSRT(content)
      setCaptions(parsed)
    }
    reader.readAsText(file)
  }

  // Parse SRT format
  const parseSRT = (content: string): Caption[] => {
    const blocks = content.trim().split(/\n\n+/)
    const parsed: Caption[] = []

    for (const block of blocks) {
      const lines = block.split('\n')
      if (lines.length >= 3) {
        const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/)
        if (timeMatch) {
          const startTime = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000
          const endTime = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000
          const text = lines.slice(2).join('\n')
          
          parsed.push({
            id: `caption-${Date.now()}-${parsed.length}`,
            startTime,
            endTime,
            text
          })
        }
      }
    }

    return parsed
  }

  // Export to SRT
  const handleExportSRT = () => {
    let srt = ''
    captions.forEach((caption, index) => {
      srt += `${index + 1}\n`
      srt += `${formatSRTTime(caption.startTime)} --> ${formatSRTTime(caption.endTime)}\n`
      srt += `${caption.text}\n\n`
    })

    const blob = new Blob([srt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'captions.srt'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Format time for SRT
  const formatSRTTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
  }

  // Format display time
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  // Apply style preset
  const handleApplyPreset = (presetId: string) => {
    const preset = CAPTION_STYLES.find(s => s.id === presetId)
    if (preset) {
      setCaptionStyle(preset.style)
      setActiveStylePreset(presetId)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Subtitles className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-semibold">Captions</h2>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleGenerateCaptions}
          disabled={!jobId || isGenerating}
          className="flex-1 px-3 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Auto Generate
            </>
          )}
        </button>
        
        <button
          onClick={handleAddCaption}
          className="px-3 py-2 bg-[#1a1a24] hover:bg-[#252532] rounded-lg text-sm transition-colors"
          title="Add caption"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Import/Export */}
      <div className="flex gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 px-3 py-2 bg-[#1a1a24] hover:bg-[#252532] rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Import SRT
        </button>
        <button
          onClick={handleExportSRT}
          disabled={captions.length === 0}
          className="flex-1 px-3 py-2 bg-[#1a1a24] hover:bg-[#252532] rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export SRT
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".srt,.vtt"
          onChange={handleImportSRT}
          className="hidden"
        />
      </div>

      {/* Style Presets */}
      <div className="space-y-2">
        <label className="text-xs text-zinc-500">Style</label>
        <div className="flex gap-1 flex-wrap">
          {CAPTION_STYLES.map(preset => (
            <button
              key={preset.id}
              onClick={() => handleApplyPreset(preset.id)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                activeStylePreset === preset.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1a1a24] text-zinc-400 hover:text-white'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Current Caption Preview */}
      {currentCaption && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="text-xs text-blue-400 mb-1">Now showing:</div>
          <div 
            className="text-sm"
            style={{
              fontFamily: captionStyle.fontFamily,
              color: captionStyle.color,
              textShadow: captionStyle.outline ? '1px 1px 2px black, -1px -1px 2px black' : 'none'
            }}
          >
            {currentCaption.text}
          </div>
        </div>
      )}

      {/* Captions List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {captions.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            <Subtitles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No captions yet</p>
            <p className="text-xs mt-1">Generate with AI or add manually</p>
          </div>
        ) : (
          captions.map((caption, index) => (
            <div
              key={caption.id}
              id={`caption-${caption.id}`}
              className={`p-3 rounded-lg transition-colors cursor-pointer ${
                selectedCaption === caption.id
                  ? 'bg-blue-600/20 border border-blue-500/50'
                  : currentCaption?.id === caption.id
                    ? 'bg-green-600/10 border border-green-500/30'
                    : 'bg-[#1a1a24] border border-transparent hover:border-zinc-700'
              }`}
              onClick={() => handleJumpToCaption(caption)}
            >
              {editingCaption === caption.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full px-2 py-1 bg-[#0a0a10] border border-zinc-700 rounded text-sm resize-none focus:outline-none focus:border-blue-500"
                    rows={2}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSaveEdit()
                      } else if (e.key === 'Escape') {
                        handleCancelEdit()
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <div className="flex-1 flex gap-2">
                      <input
                        type="number"
                        value={caption.startTime.toFixed(2)}
                        onChange={(e) => handleUpdateCaption(caption.id, { startTime: parseFloat(e.target.value) })}
                        className="w-20 px-2 py-1 bg-[#0a0a10] border border-zinc-700 rounded text-xs"
                        step="0.1"
                      />
                      <span className="text-zinc-500 self-center">-</span>
                      <input
                        type="number"
                        value={caption.endTime.toFixed(2)}
                        onChange={(e) => handleUpdateCaption(caption.id, { endTime: parseFloat(e.target.value) })}
                        className="w-20 px-2 py-1 bg-[#0a0a10] border border-zinc-700 rounded text-xs"
                        step="0.1"
                      />
                    </div>
                    <button
                      onClick={handleSaveEdit}
                      className="p-1 hover:bg-green-500/20 rounded text-green-400"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1 hover:bg-red-500/20 rounded text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(caption.startTime)} - {formatTime(caption.endTime)}</span>
                        <span className="text-zinc-600">#{index + 1}</span>
                      </div>
                      <p className="text-sm text-zinc-300 line-clamp-2">{caption.text}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartEdit(caption)
                        }}
                        className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteCaption(caption.id)
                        }}
                        className="p-1 hover:bg-red-500/20 rounded text-zinc-400 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Caption count */}
      {captions.length > 0 && (
        <div className="text-xs text-zinc-500 text-center">
          {captions.length} caption{captions.length !== 1 ? 's' : ''} total
        </div>
      )}
    </div>
  )
}
