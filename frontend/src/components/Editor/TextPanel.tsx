import { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import {
  Type,
  Plus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Palette,
  Move,
  Sparkles
} from 'lucide-react'

interface TextPreset {
  id: string
  name: string
  style: {
    fontSize: number
    fontFamily: string
    color: string
    backgroundColor?: string
    fontWeight?: string
    textShadow?: string
    animation?: string
  }
}

const TEXT_PRESETS: TextPreset[] = [
  {
    id: 'basic',
    name: 'Basic',
    style: { fontSize: 32, fontFamily: 'Inter', color: '#ffffff' }
  },
  {
    id: 'title',
    name: 'Title',
    style: { fontSize: 48, fontFamily: 'Inter', color: '#ffffff', fontWeight: 'bold' }
  },
  {
    id: 'subtitle',
    name: 'Subtitle',
    style: { fontSize: 24, fontFamily: 'Inter', color: '#d1d5db' }
  },
  {
    id: 'caption',
    name: 'Caption',
    style: { fontSize: 18, fontFamily: 'Inter', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.7)' }
  },
  {
    id: 'neon',
    name: 'Neon',
    style: { 
      fontSize: 36, 
      fontFamily: 'Inter', 
      color: '#00ff88', 
      textShadow: '0 0 10px #00ff88, 0 0 20px #00ff88, 0 0 30px #00ff88' 
    }
  },
  {
    id: 'outline',
    name: 'Outline',
    style: { 
      fontSize: 36, 
      fontFamily: 'Inter', 
      color: 'transparent', 
      textShadow: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff' 
    }
  },
  {
    id: 'gradient',
    name: 'Gradient',
    style: { 
      fontSize: 40, 
      fontFamily: 'Inter', 
      color: '#ffffff',
      fontWeight: 'bold'
    }
  },
  {
    id: 'retro',
    name: 'Retro',
    style: { 
      fontSize: 32, 
      fontFamily: 'Courier New', 
      color: '#fbbf24',
      textShadow: '2px 2px 0 #b45309'
    }
  }
]

const TEXT_ANIMATIONS = [
  { id: 'none', name: 'None' },
  { id: 'fade-in', name: 'Fade In' },
  { id: 'fade-out', name: 'Fade Out' },
  { id: 'slide-up', name: 'Slide Up' },
  { id: 'slide-down', name: 'Slide Down' },
  { id: 'slide-left', name: 'Slide Left' },
  { id: 'slide-right', name: 'Slide Right' },
  { id: 'zoom-in', name: 'Zoom In' },
  { id: 'zoom-out', name: 'Zoom Out' },
  { id: 'bounce', name: 'Bounce' },
  { id: 'typewriter', name: 'Typewriter' },
  { id: 'glitch', name: 'Glitch' },
  { id: 'shake', name: 'Shake' },
  { id: 'pulse', name: 'Pulse' },
  { id: 'rotate', name: 'Rotate' },
]

const FONT_FAMILIES = [
  'Inter',
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Impact',
  'Comic Sans MS',
]

const COLORS = [
  '#ffffff', '#000000', '#f87171', '#fb923c', '#fbbf24', 
  '#a3e635', '#34d399', '#22d3ee', '#60a5fa', '#a78bfa',
  '#f472b6', '#e879f9'
]

export function TextPanel() {
  const { 
    addTextOverlay, 
    textOverlays, 
    selectedClipId, 
    updateTextOverlay,
    currentTime,
    videoDuration
  } = useEditorStore()

  const [newText, setNewText] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<string>('basic')
  const [customStyle, setCustomStyle] = useState({
    fontSize: 32,
    fontFamily: 'Inter',
    color: '#ffffff',
    backgroundColor: '',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'center' as 'left' | 'center' | 'right',
    animation: 'none'
  })

  const selectedOverlay = textOverlays.find(o => o.id === selectedClipId)

  const handleAddText = () => {
    if (!newText.trim()) return

    const preset = TEXT_PRESETS.find(p => p.id === selectedPreset)
    const style = preset?.style || customStyle

    addTextOverlay({
      id: `text-${Date.now()}`,
      text: newText,
      startTime: currentTime,
      endTime: Math.min(currentTime + 5, videoDuration || currentTime + 5),
      position: { x: 50, y: 50 },
      style: {
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        color: style.color,
        backgroundColor: style.backgroundColor
      }
    })

    setNewText('')
  }

  const handlePresetClick = (presetId: string) => {
    setSelectedPreset(presetId)
    const preset = TEXT_PRESETS.find(p => p.id === presetId)
    if (preset) {
      setCustomStyle({
        ...customStyle,
        fontSize: preset.style.fontSize,
        fontFamily: preset.style.fontFamily,
        color: preset.style.color,
        backgroundColor: preset.style.backgroundColor || '',
        fontWeight: preset.style.fontWeight || 'normal'
      })
    }
  }

  const handleStyleChange = <K extends keyof typeof customStyle>(key: K, value: typeof customStyle[K]) => {
    setCustomStyle(prev => ({ ...prev, [key]: value }))
    
    // Update selected overlay if one is selected
    if (selectedOverlay) {
      updateTextOverlay(selectedOverlay.id, {
        style: {
          ...selectedOverlay.style,
          [key]: value
        }
      })
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Type className="w-5 h-5 text-yellow-400" />
        <h2 className="text-lg font-semibold">Text & Titles</h2>
      </div>

      {/* Add Text Input */}
      <div className="space-y-2">
        <label className="text-sm text-zinc-400">Add Text</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Enter text..."
            className="flex-1 px-3 py-2 bg-[#1a1a24] border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-violet-500"
            onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
          />
          <button
            onClick={handleAddText}
            disabled={!newText.trim()}
            className="px-3 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Text Presets */}
      <div className="space-y-2">
        <label className="text-sm text-zinc-400">Presets</label>
        <div className="grid grid-cols-2 gap-2">
          {TEXT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset.id)}
              className={`p-3 rounded-lg text-left transition-all ${
                selectedPreset === preset.id
                  ? 'bg-violet-600/20 border border-violet-500'
                  : 'bg-[#1a1a24] border border-transparent hover:border-zinc-600'
              }`}
            >
              <div 
                className="text-sm font-medium truncate"
                style={{
                  fontFamily: preset.style.fontFamily,
                  color: preset.style.color === 'transparent' ? '#fff' : preset.style.color,
                  fontWeight: preset.style.fontWeight as any,
                  textShadow: preset.style.textShadow
                }}
              >
                {preset.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Style Controls */}
      <div className="space-y-4 pt-4 border-t border-zinc-700">
        <h3 className="text-sm font-medium text-zinc-300">Style</h3>

        {/* Font Family */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-500">Font</label>
          <select
            value={customStyle.fontFamily}
            onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
            className="w-full px-3 py-2 bg-[#1a1a24] border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-violet-500"
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </option>
            ))}
          </select>
        </div>

        {/* Font Size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-500">Size</label>
            <span className="text-xs text-zinc-400">{customStyle.fontSize}px</span>
          </div>
          <input
            type="range"
            min={12}
            max={120}
            value={customStyle.fontSize}
            onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value))}
            className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:bg-violet-500
              [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>

        {/* Text Formatting */}
        <div className="flex gap-1">
          <button
            onClick={() => handleStyleChange('fontWeight', customStyle.fontWeight === 'bold' ? 'normal' : 'bold')}
            className={`p-2 rounded-lg transition-colors ${
              customStyle.fontWeight === 'bold' ? 'bg-violet-600' : 'bg-[#1a1a24] hover:bg-[#252532]'
            }`}
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStyleChange('fontStyle', customStyle.fontStyle === 'italic' ? 'normal' : 'italic')}
            className={`p-2 rounded-lg transition-colors ${
              customStyle.fontStyle === 'italic' ? 'bg-violet-600' : 'bg-[#1a1a24] hover:bg-[#252532]'
            }`}
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStyleChange('textDecoration', customStyle.textDecoration === 'underline' ? 'none' : 'underline')}
            className={`p-2 rounded-lg transition-colors ${
              customStyle.textDecoration === 'underline' ? 'bg-violet-600' : 'bg-[#1a1a24] hover:bg-[#252532]'
            }`}
          >
            <Underline className="w-4 h-4" />
          </button>
          <div className="w-px bg-zinc-700 mx-1" />
          <button
            onClick={() => handleStyleChange('textAlign', 'left')}
            className={`p-2 rounded-lg transition-colors ${
              customStyle.textAlign === 'left' ? 'bg-violet-600' : 'bg-[#1a1a24] hover:bg-[#252532]'
            }`}
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStyleChange('textAlign', 'center')}
            className={`p-2 rounded-lg transition-colors ${
              customStyle.textAlign === 'center' ? 'bg-violet-600' : 'bg-[#1a1a24] hover:bg-[#252532]'
            }`}
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStyleChange('textAlign', 'right')}
            className={`p-2 rounded-lg transition-colors ${
              customStyle.textAlign === 'right' ? 'bg-violet-600' : 'bg-[#1a1a24] hover:bg-[#252532]'
            }`}
          >
            <AlignRight className="w-4 h-4" />
          </button>
        </div>

        {/* Color Picker */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-zinc-500" />
            <label className="text-xs text-zinc-500">Text Color</label>
          </div>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleStyleChange('color', color)}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  customStyle.color === color ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
            <input
              type="color"
              value={customStyle.color}
              onChange={(e) => handleStyleChange('color', e.target.value)}
              className="w-6 h-6 rounded-full cursor-pointer"
            />
          </div>
        </div>

        {/* Background Color */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-500">Background</label>
            {customStyle.backgroundColor && (
              <button 
                onClick={() => handleStyleChange('backgroundColor', '')}
                className="text-xs text-zinc-500 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {COLORS.slice(0, 6).map((color) => (
              <button
                key={color}
                onClick={() => handleStyleChange('backgroundColor', color + '99')}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  customStyle.backgroundColor?.startsWith(color) ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color + '99' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Animations */}
      <div className="space-y-2 pt-4 border-t border-zinc-700">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-medium text-zinc-300">Animation</h3>
        </div>
        <select
          value={customStyle.animation}
          onChange={(e) => handleStyleChange('animation', e.target.value)}
          className="w-full px-3 py-2 bg-[#1a1a24] border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-violet-500"
        >
          {TEXT_ANIMATIONS.map((anim) => (
            <option key={anim.id} value={anim.id}>
              {anim.name}
            </option>
          ))}
        </select>
      </div>

      {/* Active Text Overlays */}
      {textOverlays.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-zinc-700">
          <h3 className="text-sm font-medium text-zinc-300">Text Layers ({textOverlays.length})</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {textOverlays.map((overlay) => (
              <div
                key={overlay.id}
                className={`p-2 rounded-lg cursor-pointer transition-colors ${
                  selectedClipId === overlay.id
                    ? 'bg-violet-600/20 border border-violet-500'
                    : 'bg-[#1a1a24] hover:bg-[#252532]'
                }`}
                onClick={() => useEditorStore.getState().setSelectedClipId(overlay.id)}
              >
                <div className="text-sm truncate">{overlay.text}</div>
                <div className="text-xs text-zinc-500">
                  {overlay.startTime.toFixed(1)}s - {overlay.endTime.toFixed(1)}s
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
