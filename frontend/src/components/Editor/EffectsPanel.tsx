import { useState, useEffect } from 'react'
import { useEditorStore } from '../../store/editorStore'
import {
  Sparkles,
  Sun,
  Moon,
  Droplets,
  Flame,
  Snowflake,
  Zap,
  Film,
  Palette,
  Contrast,
  CircleDot,
  Square,
  Triangle,
  Hexagon,
  Star,
  RotateCcw,
  Eye,
  Layers,
  Move,
  ArrowRight,
  Play,
  X
} from 'lucide-react'

interface FilterPreset {
  id: string
  name: string
  icon: typeof Sun
  preview: string
  css: string
  settings: {
    brightness?: number
    contrast?: number
    saturation?: number
    hue?: number
    blur?: number
    sepia?: number
    grayscale?: number
  }
}

interface Transition {
  id: string
  name: string
  icon: typeof Square
  duration: number
  type: 'in' | 'out' | 'both'
  css?: string
}

const FILTER_PRESETS: FilterPreset[] = [
  { 
    id: 'none', 
    name: 'None', 
    icon: CircleDot, 
    preview: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)', 
    css: '',
    settings: {} 
  },
  { 
    id: 'warm', 
    name: 'Warm', 
    icon: Sun, 
    preview: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', 
    css: 'brightness(1.1) saturate(1.2) sepia(0.1)',
    settings: { brightness: 1.1, saturation: 1.2, hue: 10 } 
  },
  { 
    id: 'cool', 
    name: 'Cool', 
    icon: Snowflake, 
    preview: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', 
    css: 'brightness(1.05) saturate(0.9) hue-rotate(-10deg)',
    settings: { brightness: 1.05, saturation: 0.9, hue: -10 } 
  },
  { 
    id: 'vintage', 
    name: 'Vintage', 
    icon: Film, 
    preview: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)', 
    css: 'sepia(0.4) contrast(1.1) saturate(0.8)',
    settings: { sepia: 0.4, contrast: 1.1, saturation: 0.8 } 
  },
  { 
    id: 'dramatic', 
    name: 'Dramatic', 
    icon: Moon, 
    preview: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)', 
    css: 'contrast(1.4) brightness(0.9) saturate(0.7)',
    settings: { contrast: 1.4, brightness: 0.9, saturation: 0.7 } 
  },
  { 
    id: 'vivid', 
    name: 'Vivid', 
    icon: Zap, 
    preview: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', 
    css: 'saturate(1.5) contrast(1.2)',
    settings: { saturation: 1.5, contrast: 1.2 } 
  },
  { 
    id: 'muted', 
    name: 'Muted', 
    icon: Droplets, 
    preview: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)', 
    css: 'saturate(0.5) contrast(0.9)',
    settings: { saturation: 0.5, contrast: 0.9 } 
  },
  { 
    id: 'noir', 
    name: 'Noir', 
    icon: Contrast, 
    preview: 'linear-gradient(135deg, #374151 0%, #000000 100%)', 
    css: 'grayscale(1) contrast(1.3)',
    settings: { grayscale: 1, contrast: 1.3 } 
  },
  { 
    id: 'cyberpunk', 
    name: 'Cyberpunk', 
    icon: Flame, 
    preview: 'linear-gradient(135deg, #f0abfc 0%, #c026d3 100%)', 
    css: 'saturate(1.8) hue-rotate(10deg) contrast(1.1)',
    settings: { saturation: 1.8, hue: 10, contrast: 1.1 } 
  },
  { 
    id: 'cinematic', 
    name: 'Cinematic', 
    icon: Star, 
    preview: 'linear-gradient(135deg, #4f46e5 0%, #1e1b4b 100%)', 
    css: 'contrast(1.2) brightness(0.95) saturate(1.1)',
    settings: { contrast: 1.2, brightness: 0.95, saturation: 1.1 } 
  },
]

const TRANSITIONS: Transition[] = [
  { id: 'cut', name: 'Cut', icon: Square, duration: 0, type: 'both' },
  { id: 'fade', name: 'Fade', icon: CircleDot, duration: 0.5, type: 'both', css: 'opacity' },
  { id: 'dissolve', name: 'Dissolve', icon: Droplets, duration: 0.5, type: 'both' },
  { id: 'slide-left', name: 'Slide Left', icon: ArrowRight, duration: 0.5, type: 'in' },
  { id: 'slide-right', name: 'Slide Right', icon: ArrowRight, duration: 0.5, type: 'in' },
  { id: 'slide-up', name: 'Slide Up', icon: Triangle, duration: 0.5, type: 'in' },
  { id: 'slide-down', name: 'Slide Down', icon: Triangle, duration: 0.5, type: 'in' },
  { id: 'zoom-in', name: 'Zoom In', icon: Hexagon, duration: 0.5, type: 'in' },
  { id: 'zoom-out', name: 'Zoom Out', icon: Hexagon, duration: 0.5, type: 'out' },
  { id: 'wipe-left', name: 'Wipe Left', icon: Square, duration: 0.5, type: 'both' },
  { id: 'wipe-right', name: 'Wipe Right', icon: Square, duration: 0.5, type: 'both' },
  { id: 'spin', name: 'Spin', icon: RotateCcw, duration: 0.5, type: 'both' },
  { id: 'blur', name: 'Blur', icon: Eye, duration: 0.5, type: 'both' },
  { id: 'flash', name: 'Flash', icon: Zap, duration: 0.3, type: 'both' },
]

const ANIMATION_PRESETS = [
  { id: 'none', name: 'None', duration: 0 },
  { id: 'ken-burns', name: 'Ken Burns', duration: 5 },
  { id: 'pan-left', name: 'Pan Left', duration: 3 },
  { id: 'pan-right', name: 'Pan Right', duration: 3 },
  { id: 'zoom-slow', name: 'Slow Zoom', duration: 5 },
  { id: 'shake', name: 'Shake', duration: 0.5 },
  { id: 'pulse', name: 'Pulse', duration: 1 },
  { id: 'bounce', name: 'Bounce', duration: 0.5 },
]

export function EffectsPanel() {
  const { addEffect, effects, videoUrl, currentTime, videoDuration, removeEffect } = useEditorStore()
  const [activeTab, setActiveTab] = useState<'filters' | 'transitions' | 'animations' | 'adjustments'>('filters')
  const [selectedFilter, setSelectedFilter] = useState<string>('none')
  const [selectedTransition, setSelectedTransition] = useState<string | null>(null)
  const [transitionDuration, setTransitionDuration] = useState(0.5)
  const [adjustments, setAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    blur: 0,
    vignette: 0,
    sharpen: 0,
    exposure: 0
  })
  const [previewFilter, setPreviewFilter] = useState<string>('')

  // Apply filter preview to video element
  useEffect(() => {
    const videoElement = document.querySelector('video')
    if (videoElement) {
      if (previewFilter) {
        videoElement.style.filter = previewFilter
      } else if (selectedFilter !== 'none') {
        const filter = FILTER_PRESETS.find(f => f.id === selectedFilter)
        if (filter?.css) {
          videoElement.style.filter = filter.css
        }
      } else {
        // Apply manual adjustments
        const filterParts = []
        if (adjustments.brightness !== 100) filterParts.push(`brightness(${adjustments.brightness / 100})`)
        if (adjustments.contrast !== 100) filterParts.push(`contrast(${adjustments.contrast / 100})`)
        if (adjustments.saturation !== 100) filterParts.push(`saturate(${adjustments.saturation / 100})`)
        if (adjustments.hue !== 0) filterParts.push(`hue-rotate(${adjustments.hue}deg)`)
        if (adjustments.blur > 0) filterParts.push(`blur(${adjustments.blur}px)`)
        
        videoElement.style.filter = filterParts.join(' ') || 'none'
      }
    }
  }, [selectedFilter, previewFilter, adjustments])

  const handleFilterSelect = (filterId: string) => {
    setSelectedFilter(filterId)
    const filter = FILTER_PRESETS.find(f => f.id === filterId)
    if (filter && filter.id !== 'none') {
      // Remove existing filter effects
      effects.filter(e => e.type === 'filter').forEach(e => removeEffect(e.id))
      
      addEffect({
        id: `filter-${Date.now()}`,
        type: 'filter',
        name: filter.name,
        params: { ...filter.settings, css: filter.css },
        startTime: 0,
        endTime: videoDuration || 9999
      })
    } else {
      // Remove all filter effects
      effects.filter(e => e.type === 'filter').forEach(e => removeEffect(e.id))
    }
  }

  const handleTransitionAdd = (transitionId: string) => {
    const transition = TRANSITIONS.find(t => t.id === transitionId)
    if (!transition) return

    addEffect({
      id: `transition-${Date.now()}`,
      type: 'transition',
      name: transition.name,
      params: { 
        transitionType: transition.id,
        duration: transitionDuration 
      },
      startTime: currentTime,
      endTime: currentTime + transitionDuration
    })
  }

  const handleAdjustmentChange = (key: keyof typeof adjustments, value: number) => {
    setAdjustments(prev => ({ ...prev, [key]: value }))
    setSelectedFilter('none') // Clear preset when making manual adjustments
  }

  const resetAdjustments = () => {
    setAdjustments({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue: 0,
      blur: 0,
      vignette: 0,
      sharpen: 0,
      exposure: 0
    })
    setSelectedFilter('none')
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-violet-400" />
        <h2 className="text-lg font-semibold">Effects</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#1a1a24] rounded-lg">
        {(['filters', 'transitions', 'animations', 'adjustments'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'bg-violet-600 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filters Tab */}
      {activeTab === 'filters' && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">
            Select a filter to apply to your video
          </p>
          <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
            {FILTER_PRESETS.map(filter => (
              <button
                key={filter.id}
                onClick={() => handleFilterSelect(filter.id)}
                onMouseEnter={() => setPreviewFilter(filter.css)}
                onMouseLeave={() => setPreviewFilter('')}
                className={`p-3 rounded-xl transition-all ${
                  selectedFilter === filter.id
                    ? 'ring-2 ring-violet-500 bg-violet-500/10'
                    : 'bg-[#1a1a24] hover:bg-[#252532]'
                }`}
              >
                <div 
                  className="w-full aspect-video rounded-lg mb-2 flex items-center justify-center"
                  style={{ background: filter.preview }}
                >
                  <filter.icon className="w-6 h-6 text-white/70" />
                </div>
                <span className="text-xs font-medium">{filter.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Transitions Tab */}
      {activeTab === 'transitions' && (
        <div className="space-y-4">
          {/* Duration Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-500">Duration</label>
              <span className="text-xs text-zinc-300">{transitionDuration}s</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={2}
              step={0.1}
              value={transitionDuration}
              onChange={(e) => setTransitionDuration(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:bg-violet-500
                [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>

          <p className="text-xs text-zinc-500">
            Click to add transition at current time
          </p>
          
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {TRANSITIONS.map(transition => (
              <button
                key={transition.id}
                onClick={() => handleTransitionAdd(transition.id)}
                className={`p-3 rounded-xl bg-[#1a1a24] hover:bg-[#252532] transition-all group ${
                  selectedTransition === transition.id ? 'ring-2 ring-violet-500' : ''
                }`}
              >
                <div className="w-full aspect-video rounded-lg bg-[#252532] flex items-center justify-center mb-2 group-hover:bg-[#2a2a3a] relative overflow-hidden">
                  <transition.icon className="w-6 h-6 text-zinc-500 group-hover:text-violet-400 transition-colors" />
                  {/* Preview animation on hover */}
                  <div className="absolute inset-0 bg-violet-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-medium">{transition.name}</span>
                  {transition.duration > 0 && (
                    <span className="text-[10px] text-zinc-500 block">
                      {transition.duration}s
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Animations Tab */}
      {activeTab === 'animations' && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500">
            Apply motion effects to clips
          </p>
          
          <div className="grid grid-cols-2 gap-2">
            {ANIMATION_PRESETS.map(anim => (
              <button
                key={anim.id}
                onClick={() => {
                  if (anim.id !== 'none') {
                    addEffect({
                      id: `anim-${Date.now()}`,
                      type: 'animation',
                      name: anim.name,
                      params: { animationType: anim.id, duration: anim.duration },
                      startTime: currentTime,
                      endTime: currentTime + anim.duration
                    })
                  }
                }}
                className="p-3 rounded-xl bg-[#1a1a24] hover:bg-[#252532] transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{anim.name}</span>
                  {anim.duration > 0 && (
                    <span className="text-xs text-zinc-500">{anim.duration}s</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Adjustments Tab */}
      {activeTab === 'adjustments' && (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* Brightness */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Brightness</span>
              <span className="text-sm text-white">{adjustments.brightness}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={200}
              value={adjustments.brightness}
              onChange={(e) => handleAdjustmentChange('brightness', parseInt(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:bg-violet-500
                [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>

          {/* Contrast */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Contrast</span>
              <span className="text-sm text-white">{adjustments.contrast}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={200}
              value={adjustments.contrast}
              onChange={(e) => handleAdjustmentChange('contrast', parseInt(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:bg-violet-500
                [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>

          {/* Saturation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Saturation</span>
              <span className="text-sm text-white">{adjustments.saturation}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={200}
              value={adjustments.saturation}
              onChange={(e) => handleAdjustmentChange('saturation', parseInt(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:bg-violet-500
                [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>

          {/* Hue */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Hue Rotate</span>
              <span className="text-sm text-white">{adjustments.hue}°</span>
            </div>
            <input
              type="range"
              min={-180}
              max={180}
              value={adjustments.hue}
              onChange={(e) => handleAdjustmentChange('hue', parseInt(e.target.value))}
              className="w-full h-1.5 bg-gradient-to-r from-red-500 via-green-500 to-blue-500 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:bg-white
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:shadow-md"
            />
          </div>

          {/* Blur */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Blur</span>
              <span className="text-sm text-white">{adjustments.blur}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              value={adjustments.blur}
              onChange={(e) => handleAdjustmentChange('blur', parseInt(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:bg-violet-500
                [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>

          {/* Vignette */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Vignette</span>
              <span className="text-sm text-white">{adjustments.vignette}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={adjustments.vignette}
              onChange={(e) => handleAdjustmentChange('vignette', parseInt(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:bg-violet-500
                [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>

          {/* Reset Button */}
          <button
            onClick={resetAdjustments}
            className="w-full py-2 bg-[#1a1a24] hover:bg-[#252532] rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Adjustments
          </button>
        </div>
      )}

      {/* Active Effects List */}
      {effects.length > 0 && (
        <div className="pt-4 border-t border-zinc-700">
          <h3 className="text-sm font-medium text-zinc-300 mb-2">Active Effects ({effects.length})</h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {effects.map(effect => (
              <div 
                key={effect.id}
                className="flex items-center justify-between p-2 bg-[#1a1a24] rounded-lg text-xs"
              >
                <div>
                  <span className="text-zinc-300">{effect.name}</span>
                  <span className="text-zinc-500 ml-2">
                    {effect.startTime.toFixed(1)}s - {effect.endTime.toFixed(1)}s
                  </span>
                </div>
                <button
                  onClick={() => removeEffect(effect.id)}
                  className="p-1 hover:bg-red-500/20 rounded text-zinc-400 hover:text-red-400"
                >
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
