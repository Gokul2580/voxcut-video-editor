import { useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { Toolbar } from '../components/Editor/Toolbar'
import { VideoPreview } from '../components/Editor/VideoPreview'
import { PropertiesPanel } from '../components/Editor/PropertiesPanel'
import { Timeline } from '../components/Editor/Timeline'
import { VoiceCommandBar } from '../components/Editor/VoiceCommandBar'
import { AIEnhancePanel } from '../components/Editor/AIEnhancePanel'
import { EffectsPanel } from '../components/Editor/EffectsPanel'
import { ProcessingOverlay } from '../components/Editor/ProcessingOverlay'
import { 
  Upload, 
  Film,
  Sparkles,
  Wand2,
  Type,
  Music,
  Layers
} from 'lucide-react'

export function EditorPage() {
  const { 
    videoUrl, 
    setVideoFile, 
    setVideoUrl,
    activePanel,
    setActivePanel,
    isProcessing,
    addVideoClip,
    setVideoDuration
  } = useEditorStore()
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file)
      const url = URL.createObjectURL(file)
      setVideoUrl(url)
      
      // Create a video element to get duration
      const video = document.createElement('video')
      video.src = url
      video.onloadedmetadata = () => {
        setVideoDuration(video.duration)
        addVideoClip({
          id: `clip-${Date.now()}`,
          name: file.name,
          src: url,
          duration: video.duration,
          startTime: 0,
          endTime: video.duration,
          trackIndex: 0
        })
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const toolbarItems = [
    { id: 'tools', icon: Layers, label: 'Edit' },
    { id: 'effects', icon: Sparkles, label: 'Effects' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'audio', icon: Music, label: 'Audio' },
    { id: 'ai', icon: Wand2, label: 'AI Tools' },
  ] as const

  return (
    <div className="h-screen w-screen bg-[#0a0a0f] text-white flex flex-col overflow-hidden">
      {/* Processing Overlay */}
      {isProcessing && <ProcessingOverlay />}
      
      {/* Top Bar */}
      <header className="h-14 bg-[#12121a] border-b border-[#1e1e2e] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Film className="w-6 h-6 text-violet-500" />
            <span className="font-bold text-lg">VoxCut</span>
          </div>
          <span className="text-zinc-500 text-sm">|</span>
          <span className="text-zinc-400 text-sm">Untitled Project</span>
        </div>
        
        <div className="flex items-center gap-3">
          <VoiceCommandBar />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tools */}
        <aside className="w-16 bg-[#0d0d14] border-r border-[#1e1e2e] flex flex-col items-center py-4 gap-2 shrink-0">
          {toolbarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePanel(item.id)}
              className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                activePanel === item.id
                  ? 'bg-violet-600 text-white'
                  : 'text-zinc-500 hover:bg-[#1a1a24] hover:text-zinc-300'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </button>
          ))}
        </aside>

        {/* Secondary Panel */}
        <aside className="w-72 bg-[#0d0d14] border-r border-[#1e1e2e] shrink-0 overflow-y-auto">
          {activePanel === 'tools' && <Toolbar />}
          {activePanel === 'effects' && <EffectsPanel />}
          {activePanel === 'text' && <Toolbar />}
          {activePanel === 'audio' && <Toolbar />}
          {activePanel === 'ai' && <AIEnhancePanel />}
        </aside>

        {/* Main Preview Area */}
        <main className="flex-1 flex flex-col min-w-0">
          {!videoUrl ? (
            <div 
              className={`flex-1 flex items-center justify-center ${
                isDragging ? 'bg-violet-600/10' : ''
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div 
                className={`border-2 border-dashed rounded-2xl p-16 flex flex-col items-center gap-4 transition-colors cursor-pointer ${
                  isDragging 
                    ? 'border-violet-500 bg-violet-500/10' 
                    : 'border-zinc-700 hover:border-zinc-600'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 rounded-full bg-[#1a1a24] flex items-center justify-center">
                  <Upload className="w-10 h-10 text-zinc-500" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-zinc-300">
                    Drop video here or click to upload
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">
                    Supports MP4, MOV, AVI, WebM
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <VideoPreview />
          )}
        </main>

        {/* Right Sidebar - Properties */}
        <aside className="w-72 bg-[#0d0d14] border-l border-[#1e1e2e] shrink-0 overflow-y-auto">
          <PropertiesPanel />
        </aside>
      </div>

      {/* Timeline */}
      <Timeline />
    </div>
  )
}
