import { useEditorStore } from '../../store/editorStore'
import {
  Scissors,
  Copy,
  Trash2,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  Move,
  CornerUpLeft,
  CornerUpRight,
  Layers,
  SplitSquareVertical
} from 'lucide-react'

interface ToolItem {
  id: string
  icon: typeof Scissors
  label: string
  shortcut?: string
  action: () => void
}

export function Toolbar() {
  const { selectedClipId, videoClips, removeVideoClip } = useEditorStore()

  const handleSplit = () => {
    console.log('Split clip at current time')
  }

  const handleDuplicate = () => {
    console.log('Duplicate selected clip')
  }

  const handleDelete = () => {
    if (selectedClipId) {
      removeVideoClip(selectedClipId)
    }
  }

  const handleRotate = () => {
    console.log('Rotate clip')
  }

  const handleFlipH = () => {
    console.log('Flip horizontal')
  }

  const handleFlipV = () => {
    console.log('Flip vertical')
  }

  const handleCrop = () => {
    console.log('Crop clip')
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
            <span className="text-sm text-white">1.0x</span>
          </div>
          <input
            type="range"
            min={0.25}
            max={4}
            step={0.25}
            defaultValue={1}
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
            <span className="text-sm text-white">100%</span>
          </div>
          <input
            type="range"
            min={0}
            max={200}
            step={1}
            defaultValue={100}
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
            <span className="text-sm text-white">100%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            defaultValue={100}
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
