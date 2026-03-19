import { useState } from 'react'
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
  Heart
} from 'lucide-react'

interface FilterPreset {
  id: string
  name: string
  icon: typeof Sun
  preview: string
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
}

const FILTER_PRESETS: FilterPreset[] = [
  { id: 'none', name: 'None', icon: CircleDot, preview: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)', settings: {} },
  { id: 'warm', name: 'Warm', icon: Sun, preview: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', settings: { brightness: 1.1, saturation: 1.2, hue: 10 } },
  { id: 'cool', name: 'Cool', icon: Snowflake, preview: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', settings: { brightness: 1.05, saturation: 0.9, hue: -10 } },
  { id: 'vintage', name: 'Vintage', icon: Film, preview: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)', settings: { sepia: 0.4, contrast: 1.1, saturation: 0.8 } },
  { id: 'dramatic', name: 'Dramatic', icon: Moon, preview: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)', settings: { contrast: 1.4, brightness: 0.9, saturation: 0.7 } },
  { id: 'vivid', name: 'Vivid', icon: Zap, preview: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', settings: { saturation: 1.5, contrast: 1.2 } },
  { id: 'muted', name: 'Muted', icon: Droplets, preview: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)', settings: { saturation: 0.5, contrast: 0.9 } },
  { id: 'noir', name: 'Noir', icon: Contrast, preview: 'linear-gradient(135deg, #374151 0%, #000000 100%)', settings: { grayscale: 1, contrast: 1.3 } },
]

const TRANSITIONS: Transition[] = [
  { id: 'cut', name: 'Cut', icon: Square, duration: 0 },
  { id: 'fade', name: 'Fade', icon: CircleDot, duration: 0.5 },
  { id: 'dissolve', name: 'Dissolve', icon: Droplets, duration: 0.5 },
  { id: 'slide-left', name: 'Slide Left', icon: Triangle, duration: 0.5 },
  { id: 'slide-right', name: 'Slide Right', icon: Triangle, duration: 0.5 },
  { id: 'zoom', name: 'Zoom', icon: Hexagon, duration: 0.5 },
  { id: 'wipe', name: 'Wipe', icon: Square, duration: 0.5 },
  { id: 'spin', name: 'Spin', icon: Star, duration: 0.5 },
]

export function EffectsPanel() {
  const { addEffect, videoUrl } = useEditorStore()
  const [activeTab, setActiveTab] = useState<'filters' | 'transitions' | 'adjustments'>('filters')
  const [selectedFilter, setSelectedFilter] = useState<string>('none')
  const [adjustments, setAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    blur: 0,
    vignette: 0
  })

  const handleFilterSelect = (filterId: string) => {
    setSelectedFilter(filterId)
    const filter = FILTER_PRESETS.find(f => f.id === filterId)
    if (filter && filter.id !== 'none') {
      addEffect({
        id: `filter-${Date.now()}`,
        type: 'filter',
        name: filter.name,
        params: filter.settings,
        startTime: 0,
        endTime: 9999
      })
    }
  }

  const handleAdjustmentChange = (key: keyof typeof adjustments, value: number) => {
    setAdjustments(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-violet-400" />
        <h2 className="text-lg font-semibold">Effects</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#1a1a24] rounded-lg">
        {(['filters', 'transitions', 'adjustments'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
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
        <div className="grid grid-cols-2 gap-2">
          {FILTER_PRESETS.map(filter => (
            <button
              key={filter.id}
              onClick={() => handleFilterSelect(filter.id)}
              className={`p-3 rounded-xl transition-all ${
                selectedFilter === filter.id
                  ? 'ring-2 ring-violet-500 bg-violet-500/10'
                  : 'bg-[#1a1a24] hover:bg-[#252532]'
              }`}
            >
              <div 
                className="w-full aspect-video rounded-lg mb-2"
                style={{ background: filter.preview }}
              />
              <span className="text-xs font-medium">{filter.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Transitions Tab */}
      {activeTab === 'transitions' && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500">
            Drag a transition between clips on the timeline
          </p>
          <div className="grid grid-cols-2 gap-2">
            {TRANSITIONS.map(transition => (
              <button
                key={transition.id}
                className="p-3 rounded-xl bg-[#1a1a24] hover:bg-[#252532] transition-all group"
                draggable
              >
                <div className="w-full aspect-video rounded-lg bg-[#252532] flex items-center justify-center mb-2 group-hover:bg-[#2a2a3a]">
                  <transition.icon className="w-6 h-6 text-zinc-500 group-hover:text-violet-400 transition-colors" />
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

      {/* Adjustments Tab */}
      {activeTab === 'adjustments' && (
        <div className="space-y-4">
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
            onClick={() => setAdjustments({
              brightness: 100,
              contrast: 100,
              saturation: 100,
              hue: 0,
              blur: 0,
              vignette: 0
            })}
            className="w-full py-2 bg-[#1a1a24] hover:bg-[#252532] rounded-lg text-sm transition-colors"
          >
            Reset Adjustments
          </button>
        </div>
      )}
    </div>
  )
}
