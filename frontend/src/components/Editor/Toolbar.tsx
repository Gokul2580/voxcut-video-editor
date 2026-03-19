import { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import {
  Scissors,
  Copy,
  Trash2,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  Layers
} from 'lucide-react'

interface ToolItem {
  id: string
  icon: typeof Scissors
  label: string
  shortcut?: string
  action: () => void
}

export function Toolbar() {
  const { 
    selectedClipId, 
    videoClips, 
    removeVideoClip, 
    addVideoClip,
    currentTime,
    updateVideoClip,
    playbackRate,
    setPlaybackRate,
    volume,
    setVolume
  } = useEditorStore()
  
  const [clipSpeed, setClipSpeed] = useState(1)
  const [clipVolume, setClipVolume] = useState(100)
  const [clipOpacity, setClipOpacity] = useState(100)

  const selectedClip = videoClips.find(c => c.id === selectedClipId)

  const handleSplit = () => {
    if (selectedClip && currentTime > selectedClip.startTime && currentTime < selectedClip.endTime) {
      // Create two clips from the split
      const newClip = {
        ...selectedClip,
        id: `clip-${Date.now()}`,
        startTime: currentTime,
      }
      updateVideoClip(selectedClip.id, { endTime: currentTime })
      addVideoClip(newClip)
    }
  }

  const handleDuplicate = () => {
    if (selectedClip) {
      addVideoClip({
        ...selectedClip,
        id: `clip-${Date.now()}`,
        startTime: selectedClip.endTime,
        endTime: selectedClip.endTime + (selectedClip.endTime - selectedClip.startTime)
      })
    }
  }

  const handleDelete = () => {
    if (selectedClipId) {
      removeVideoClip(selectedClipId)
    }
  }

  const handleRotate = () => {
    // Apply rotation effect
    console.log('Rotate clip')
  }

  const handleFlipH = () => {
    // Apply horizontal flip
    console.log('Flip horizontal')
  }

  const handleFlipV = () => {
    // Apply vertical flip
    console.log('Flip vertical')
  }

  const handleCrop = () => {
    // Open crop dialog
    console.log('Crop clip')
  }
  
  const handleSpeedChange = (value: number) => {
    setClipSpeed(value)
    setPlaybackRate(value)
  }
  
  const handleVolumeChange = (value: number) => {
    setClipVolume(value)
    setVolume(value / 100)
  }

  const editTools: ToolItem[] = [
    { id: 'split', icon: Scissors, label: 'Split', shortcut: 'S', action: handleSplit },
    { id: 'duplicate', icon: Copy, label: 'Duplicate', shortcut: 'Ctrl+D', action: handleDuplicate },
    { id: 'delete', icon: Trash2, label: 'Delete', shortcut: 'Del', action: handleDelete },
  ]

  const transformTools: ToolItem[] = [
    { id: 'rotate', icon: RotateCw, label: 'Rotate', action: handleRotate },
    { id: 'flip-h', icon: FlipHorizontal, label: 'Flip H', action: handleFlipH },
    { id: 'flip-v', icon: FlipVertical, label: 'Flip V', action: handleFlipV },
    { id: 'crop', icon: Crop, label: 'Crop', action: handleCrop },
  ]

  const arrangementTools: ToolItem[] = [
    { id: 'bring-front', icon: Layers, label: 'Bring Front', action: () => {} },
    { id: 'send-back', icon: Layers, label: 'Send Back', action: () => {} },
  ]

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Edit</h3>
        <div className="grid grid-cols-3 gap-2">
          {editTools.map((tool) => (
            <button
              key={tool.id}
              onClick={tool.action}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[#1a1a24] hover:bg-[#252532] transition-colors group"
            >
              <tool.icon className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
              <span className="text-xs text-zinc-500 group-hover:text-zinc-300">{tool.label}</span>
              {tool.shortcut && (
                <span className="text-[10px] text-zinc-600">{tool.shortcut}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Transform</h3>
        <div className="grid grid-cols-4 gap-2">
          {transformTools.map((tool) => (
            <button
              key={tool.id}
              onClick={tool.action}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[#1a1a24] hover:bg-[#252532] transition-colors group"
            >
              <tool.icon className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
              <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Speed</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Playback Speed</span>
            <span className="text-sm text-white">{clipSpeed}x</span>
          </div>
          <input
            type="range"
            min={0.25}
            max={4}
            step={0.25}
            value={clipSpeed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:bg-violet-500
              [&::-webkit-slider-thumb]:rounded-full"
          />
          <div className="flex justify-between text-xs text-zinc-600">
            <span>0.25x</span>
            <span>4x</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Volume</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Clip Volume</span>
            <span className="text-sm text-white">{clipVolume}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={200}
            step={1}
            value={clipVolume}
            onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:bg-violet-500
              [&::-webkit-slider-thumb]:rounded-full"
          />
          <div className="flex justify-between text-xs text-zinc-600">
            <span>0%</span>
            <span>200%</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Opacity</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Clip Opacity</span>
            <span className="text-sm text-white">{clipOpacity}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={clipOpacity}
            onChange={(e) => setClipOpacity(parseInt(e.target.value))}
            className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:bg-violet-500
              [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>
      </div>
    </div>
  )
}
