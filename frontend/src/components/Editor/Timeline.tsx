import { useRef, useEffect, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import {
  Film,
  Music,
  Type,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut
} from 'lucide-react'

interface Track {
  id: string
  type: 'video' | 'audio' | 'text'
  name: string
  locked: boolean
  visible: boolean
}

export function Timeline() {
  const {
    videoClips,
    audioClips,
    textOverlays,
    currentTime,
    setCurrentTime,
    videoDuration,
    zoom,
    setZoom,
    selectedClipId,
    setSelectedClipId,
    setIsPlaying
  } = useEditorStore()

  const timelineRef = useRef<HTMLDivElement>(null)
  const [tracks, setTracks] = useState<Track[]>([
    { id: 'video-1', type: 'video', name: 'Video 1', locked: false, visible: true },
    { id: 'audio-1', type: 'audio', name: 'Audio 1', locked: false, visible: true },
    { id: 'text-1', type: 'text', name: 'Text 1', locked: false, visible: true },
  ])
  const [isDragging, setIsDragging] = useState(false)

  const pixelsPerSecond = 50 * zoom
  const timelineWidth = Math.max(videoDuration * pixelsPerSecond, 800)

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft
    const time = x / pixelsPerSecond
    setCurrentTime(Math.max(0, Math.min(time, videoDuration)))
    setIsPlaying(false)
  }

  const handlePlayheadDrag = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDragging(true)

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return
      const rect = timelineRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left + timelineRef.current.scrollLeft
      const time = x / pixelsPerSecond
      setCurrentTime(Math.max(0, Math.min(time, videoDuration)))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const toggleTrackLock = (trackId: string) => {
    setTracks(tracks.map(t => 
      t.id === trackId ? { ...t, locked: !t.locked } : t
    ))
  }

  const toggleTrackVisibility = (trackId: string) => {
    setTracks(tracks.map(t => 
      t.id === trackId ? { ...t, visible: !t.visible } : t
    ))
  }

  const addTrack = (type: 'video' | 'audio' | 'text') => {
    const count = tracks.filter(t => t.type === type).length + 1
    const name = `${type.charAt(0).toUpperCase() + type.slice(1)} ${count}`
    setTracks([...tracks, {
      id: `${type}-${Date.now()}`,
      type,
      name,
      locked: false,
      visible: true
    }])
  }

  const formatTimeMarker = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTrackIcon = (type: 'video' | 'audio' | 'text') => {
    switch (type) {
      case 'video': return Film
      case 'audio': return Music
      case 'text': return Type
    }
  }

  // Generate time markers
  const timeMarkers = []
  const markerInterval = zoom >= 1.5 ? 1 : zoom >= 0.75 ? 2 : 5
  for (let i = 0; i <= videoDuration; i += markerInterval) {
    timeMarkers.push(i)
  }

  return (
    <div className="h-56 bg-[#0d0d14] border-t border-[#1e1e2e] flex flex-col shrink-0">
      {/* Timeline Header */}
      <div className="h-10 bg-[#12121a] border-b border-[#1e1e2e] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => addTrack('video')}
            className="p-1.5 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors"
            title="Add video track"
          >
            <Film className="w-4 h-4" />
          </button>
          <button
            onClick={() => addTrack('audio')}
            className="p-1.5 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors"
            title="Add audio track"
          >
            <Music className="w-4 h-4" />
          </button>
          <button
            onClick={() => addTrack('text')}
            className="p-1.5 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors"
            title="Add text track"
          >
            <Type className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
            className="p-1.5 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-zinc-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(3, zoom + 0.25))}
            className="p-1.5 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timeline Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Labels */}
        <div className="w-44 bg-[#0a0a10] border-r border-[#1e1e2e] shrink-0">
          {/* Time ruler space */}
          <div className="h-6 border-b border-[#1e1e2e]" />
          
          {/* Track labels */}
          {tracks.map((track) => {
            const Icon = getTrackIcon(track.type)
            return (
              <div
                key={track.id}
                className="h-12 border-b border-[#1e1e2e] flex items-center justify-between px-2 group"
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${
                    track.type === 'video' ? 'text-violet-400' :
                    track.type === 'audio' ? 'text-green-400' :
                    'text-yellow-400'
                  }`} />
                  <span className="text-sm text-zinc-300 truncate max-w-20">{track.name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleTrackVisibility(track.id)}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    {track.visible ? (
                      <Eye className="w-3 h-3 text-zinc-400" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-zinc-500" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleTrackLock(track.id)}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    {track.locked ? (
                      <Lock className="w-3 h-3 text-zinc-500" />
                    ) : (
                      <Unlock className="w-3 h-3 text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Timeline Content */}
        <div
          ref={timelineRef}
          className="flex-1 overflow-x-auto overflow-y-hidden relative"
          onClick={handleTimelineClick}
        >
          <div style={{ width: `${timelineWidth}px` }} className="h-full relative">
            {/* Time Ruler */}
            <div className="h-6 border-b border-[#1e1e2e] relative bg-[#0a0a10]">
              {timeMarkers.map((time) => (
                <div
                  key={time}
                  className="absolute top-0 h-full flex flex-col justify-end"
                  style={{ left: `${time * pixelsPerSecond}px` }}
                >
                  <span className="text-[10px] text-zinc-500 -translate-x-1/2 mb-1">
                    {formatTimeMarker(time)}
                  </span>
                  <div className="w-px h-2 bg-zinc-700" />
                </div>
              ))}
            </div>

            {/* Tracks */}
            {tracks.map((track, index) => (
              <div
                key={track.id}
                className={`h-12 border-b border-[#1e1e2e] relative ${
                  !track.visible ? 'opacity-40' : ''
                }`}
              >
                {/* Video clips on video tracks */}
                {track.type === 'video' && videoClips.map((clip) => (
                  <div
                    key={clip.id}
                    className={`absolute top-1 bottom-1 rounded-lg overflow-hidden cursor-pointer transition-all ${
                      selectedClipId === clip.id
                        ? 'ring-2 ring-violet-500'
                        : 'hover:ring-2 hover:ring-violet-500/50'
                    }`}
                    style={{
                      left: `${clip.startTime * pixelsPerSecond}px`,
                      width: `${(clip.endTime - clip.startTime) * pixelsPerSecond}px`,
                      background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)'
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedClipId(clip.id)
                    }}
                  >
                    <div className="h-full px-2 flex items-center">
                      <span className="text-xs text-white truncate font-medium">
                        {clip.name}
                      </span>
                    </div>
                    {/* Thumbnails placeholder */}
                    <div className="absolute inset-0 flex opacity-30">
                      {Array.from({ length: Math.ceil((clip.endTime - clip.startTime) / 2) }).map((_, i) => (
                        <div
                          key={i}
                          className="h-full bg-violet-800/50"
                          style={{ width: `${2 * pixelsPerSecond}px` }}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Audio clips on audio tracks */}
                {track.type === 'audio' && audioClips.map((clip) => (
                  <div
                    key={clip.id}
                    className={`absolute top-1 bottom-1 rounded-lg overflow-hidden cursor-pointer ${
                      selectedClipId === clip.id
                        ? 'ring-2 ring-green-500'
                        : 'hover:ring-2 hover:ring-green-500/50'
                    }`}
                    style={{
                      left: `${clip.startTime * pixelsPerSecond}px`,
                      width: `${(clip.endTime - clip.startTime) * pixelsPerSecond}px`,
                      background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)'
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedClipId(clip.id)
                    }}
                  >
                    <div className="h-full px-2 flex items-center">
                      <span className="text-xs text-white truncate font-medium">
                        {clip.name}
                      </span>
                    </div>
                    {/* Waveform visualization */}
                    <div className="absolute inset-x-0 bottom-0 h-4 flex items-end justify-center gap-px px-1">
                      {Array.from({ length: 30 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-white/40 rounded-full"
                          style={{ height: `${Math.random() * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Text overlays on text tracks */}
                {track.type === 'text' && textOverlays.map((overlay) => (
                  <div
                    key={overlay.id}
                    className={`absolute top-1 bottom-1 rounded-lg overflow-hidden cursor-pointer ${
                      selectedClipId === overlay.id
                        ? 'ring-2 ring-yellow-500'
                        : 'hover:ring-2 hover:ring-yellow-500/50'
                    }`}
                    style={{
                      left: `${overlay.startTime * pixelsPerSecond}px`,
                      width: `${(overlay.endTime - overlay.startTime) * pixelsPerSecond}px`,
                      background: 'linear-gradient(135deg, #eab308 0%, #a16207 100%)'
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedClipId(overlay.id)
                    }}
                  >
                    <div className="h-full px-2 flex items-center">
                      <span className="text-xs text-white truncate font-medium">
                        {overlay.text}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-px bg-red-500 z-10 cursor-ew-resize"
              style={{ left: `${currentTime * pixelsPerSecond}px` }}
              onMouseDown={handlePlayheadDrag}
            >
              <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-red-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
