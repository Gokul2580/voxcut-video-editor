import { useRef, useEffect, useState, useCallback } from 'react'
import { useEditorStore, VideoClip, AudioClip, TextOverlay } from '../../store/editorStore'
import {
  Film,
  Music,
  Type,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Scissors,
  Copy,
  MoreHorizontal
} from 'lucide-react'

interface Track {
  id: string
  type: 'video' | 'audio' | 'text'
  name: string
  locked: boolean
  visible: boolean
}

interface DragState {
  type: 'move' | 'resize-left' | 'resize-right' | null
  clipId: string | null
  clipType: 'video' | 'audio' | 'text' | null
  startX: number
  startTime: number
  startEndTime?: number
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
    setIsPlaying,
    updateVideoClip,
    updateAudioClip,
    updateTextOverlay,
    removeVideoClip,
    removeAudioClip,
    removeTextOverlay,
    addVideoClip,
    addAudioClip
  } = useEditorStore()

  const timelineRef = useRef<HTMLDivElement>(null)
  const [tracks, setTracks] = useState<Track[]>([
    { id: 'video-1', type: 'video', name: 'Video 1', locked: false, visible: true },
    { id: 'audio-1', type: 'audio', name: 'Audio 1', locked: false, visible: true },
    { id: 'text-1', type: 'text', name: 'Text 1', locked: false, visible: true },
  ])
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false)
  const [dragState, setDragState] = useState<DragState>({ 
    type: null, 
    clipId: null, 
    clipType: null,
    startX: 0, 
    startTime: 0 
  })
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; clipId: string; clipType: string } | null>(null)

  const pixelsPerSecond = 50 * zoom
  const timelineWidth = Math.max(videoDuration * pixelsPerSecond, 800)
  const minClipWidth = 20 // Minimum clip width in pixels

  // Handle timeline click to set playhead
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState.type || isDraggingPlayhead) return
    if (!timelineRef.current) return
    
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft
    const time = x / pixelsPerSecond
    setCurrentTime(Math.max(0, Math.min(time, videoDuration)))
    setIsPlaying(false)
  }, [dragState.type, isDraggingPlayhead, pixelsPerSecond, videoDuration, setCurrentTime, setIsPlaying])

  // Handle playhead drag
  const handlePlayheadDrag = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDraggingPlayhead(true)

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return
      const rect = timelineRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left + timelineRef.current.scrollLeft
      const time = x / pixelsPerSecond
      setCurrentTime(Math.max(0, Math.min(time, videoDuration)))
    }

    const handleMouseUp = () => {
      setIsDraggingPlayhead(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [pixelsPerSecond, videoDuration, setCurrentTime])

  // Handle clip drag start
  const handleClipDragStart = useCallback((
    e: React.MouseEvent,
    clipId: string,
    clipType: 'video' | 'audio' | 'text',
    type: 'move' | 'resize-left' | 'resize-right',
    startTime: number,
    endTime?: number
  ) => {
    e.stopPropagation()
    e.preventDefault()
    
    // Check if track is locked
    const track = tracks.find(t => t.type === clipType)
    if (track?.locked) return

    setDragState({
      type,
      clipId,
      clipType,
      startX: e.clientX,
      startTime,
      startEndTime: endTime
    })
    setSelectedClipId(clipId)
  }, [tracks, setSelectedClipId])

  // Handle clip dragging
  useEffect(() => {
    if (!dragState.type || !dragState.clipId) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.startX
      const deltaTime = deltaX / pixelsPerSecond

      if (dragState.clipType === 'video') {
        const clip = videoClips.find(c => c.id === dragState.clipId)
        if (!clip) return

        if (dragState.type === 'move') {
          const newStartTime = Math.max(0, dragState.startTime + deltaTime)
          const duration = clip.endTime - clip.startTime
          updateVideoClip(clip.id, {
            startTime: newStartTime,
            endTime: newStartTime + duration
          })
        } else if (dragState.type === 'resize-left') {
          const newStartTime = Math.min(
            clip.endTime - (minClipWidth / pixelsPerSecond),
            Math.max(0, dragState.startTime + deltaTime)
          )
          updateVideoClip(clip.id, { startTime: newStartTime })
        } else if (dragState.type === 'resize-right') {
          const newEndTime = Math.max(
            clip.startTime + (minClipWidth / pixelsPerSecond),
            (dragState.startEndTime || clip.endTime) + deltaTime
          )
          updateVideoClip(clip.id, { endTime: newEndTime })
        }
      } else if (dragState.clipType === 'audio') {
        const clip = audioClips.find(c => c.id === dragState.clipId)
        if (!clip) return

        if (dragState.type === 'move') {
          const newStartTime = Math.max(0, dragState.startTime + deltaTime)
          const duration = clip.endTime - clip.startTime
          updateAudioClip(clip.id, {
            startTime: newStartTime,
            endTime: newStartTime + duration
          })
        } else if (dragState.type === 'resize-left') {
          const newStartTime = Math.min(
            clip.endTime - (minClipWidth / pixelsPerSecond),
            Math.max(0, dragState.startTime + deltaTime)
          )
          updateAudioClip(clip.id, { startTime: newStartTime })
        } else if (dragState.type === 'resize-right') {
          const newEndTime = Math.max(
            clip.startTime + (minClipWidth / pixelsPerSecond),
            (dragState.startEndTime || clip.endTime) + deltaTime
          )
          updateAudioClip(clip.id, { endTime: newEndTime })
        }
      } else if (dragState.clipType === 'text') {
        const overlay = textOverlays.find(o => o.id === dragState.clipId)
        if (!overlay) return

        if (dragState.type === 'move') {
          const newStartTime = Math.max(0, dragState.startTime + deltaTime)
          const duration = overlay.endTime - overlay.startTime
          updateTextOverlay(overlay.id, {
            startTime: newStartTime,
            endTime: newStartTime + duration
          })
        } else if (dragState.type === 'resize-left') {
          const newStartTime = Math.min(
            overlay.endTime - (minClipWidth / pixelsPerSecond),
            Math.max(0, dragState.startTime + deltaTime)
          )
          updateTextOverlay(overlay.id, { startTime: newStartTime })
        } else if (dragState.type === 'resize-right') {
          const newEndTime = Math.max(
            overlay.startTime + (minClipWidth / pixelsPerSecond),
            (dragState.startEndTime || overlay.endTime) + deltaTime
          )
          updateTextOverlay(overlay.id, { endTime: newEndTime })
        }
      }
    }

    const handleMouseUp = () => {
      setDragState({ type: null, clipId: null, clipType: null, startX: 0, startTime: 0 })
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, pixelsPerSecond, videoClips, audioClips, textOverlays, updateVideoClip, updateAudioClip, updateTextOverlay])

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, clipId: string, clipType: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, clipId, clipType })
    setSelectedClipId(clipId)
  }, [setSelectedClipId])

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // Context menu actions
  const handleSplitClip = useCallback(() => {
    if (!contextMenu) return
    const { clipId, clipType } = contextMenu

    if (clipType === 'video') {
      const clip = videoClips.find(c => c.id === clipId)
      if (clip && currentTime > clip.startTime && currentTime < clip.endTime) {
        // Create new clip from split point
        addVideoClip({
          ...clip,
          id: `clip-${Date.now()}`,
          startTime: currentTime,
        })
        // Update original clip end time
        updateVideoClip(clipId, { endTime: currentTime })
      }
    }
    setContextMenu(null)
  }, [contextMenu, currentTime, videoClips, addVideoClip, updateVideoClip])

  const handleDuplicateClip = useCallback(() => {
    if (!contextMenu) return
    const { clipId, clipType } = contextMenu

    if (clipType === 'video') {
      const clip = videoClips.find(c => c.id === clipId)
      if (clip) {
        const duration = clip.endTime - clip.startTime
        addVideoClip({
          ...clip,
          id: `clip-${Date.now()}`,
          startTime: clip.endTime,
          endTime: clip.endTime + duration
        })
      }
    }
    setContextMenu(null)
  }, [contextMenu, videoClips, addVideoClip])

  const handleDeleteClip = useCallback(() => {
    if (!contextMenu) return
    const { clipId, clipType } = contextMenu

    if (clipType === 'video') {
      removeVideoClip(clipId)
    } else if (clipType === 'audio') {
      removeAudioClip(clipId)
    } else if (clipType === 'text') {
      removeTextOverlay(clipId)
    }
    setContextMenu(null)
    setSelectedClipId(null)
  }, [contextMenu, removeVideoClip, removeAudioClip, removeTextOverlay, setSelectedClipId])

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

  // Render clip component
  const renderClip = (
    clip: { id: string; startTime: number; endTime: number; name?: string; text?: string },
    type: 'video' | 'audio' | 'text',
    color: { from: string; to: string },
    ringColor: string
  ) => {
    const isSelected = selectedClipId === clip.id
    const isDragging = dragState.clipId === clip.id
    const width = (clip.endTime - clip.startTime) * pixelsPerSecond
    const left = clip.startTime * pixelsPerSecond

    return (
      <div
        key={clip.id}
        className={`absolute top-1 bottom-1 rounded-lg overflow-hidden transition-shadow ${
          isSelected
            ? `ring-2 ${ringColor} shadow-lg`
            : `hover:ring-2 hover:${ringColor.replace('ring-', 'ring-')}/50`
        } ${isDragging ? 'opacity-80 cursor-grabbing' : 'cursor-grab'}`}
        style={{
          left: `${left}px`,
          width: `${Math.max(width, minClipWidth)}px`,
          background: `linear-gradient(135deg, ${color.from} 0%, ${color.to} 100%)`
        }}
        onMouseDown={(e) => handleClipDragStart(e, clip.id, type, 'move', clip.startTime, clip.endTime)}
        onContextMenu={(e) => handleContextMenu(e, clip.id, type)}
        onClick={(e) => {
          e.stopPropagation()
          setSelectedClipId(clip.id)
        }}
      >
        {/* Left resize handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 z-10"
          onMouseDown={(e) => handleClipDragStart(e, clip.id, type, 'resize-left', clip.startTime)}
        />
        
        {/* Clip content */}
        <div className="h-full px-3 flex items-center pointer-events-none">
          <span className="text-xs text-white truncate font-medium drop-shadow-sm">
            {clip.name || clip.text || 'Clip'}
          </span>
        </div>

        {/* Right resize handle */}
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 z-10"
          onMouseDown={(e) => handleClipDragStart(e, clip.id, type, 'resize-right', clip.startTime, clip.endTime)}
        />

        {/* Visual indicators for video clips */}
        {type === 'video' && (
          <div className="absolute inset-0 flex opacity-20 pointer-events-none">
            {Array.from({ length: Math.ceil((clip.endTime - clip.startTime) / 2) }).map((_, i) => (
              <div
                key={i}
                className="h-full bg-black/20"
                style={{ width: `${2 * pixelsPerSecond}px`, borderRight: '1px solid rgba(255,255,255,0.1)' }}
              />
            ))}
          </div>
        )}

        {/* Waveform for audio */}
        {type === 'audio' && (
          <div className="absolute inset-x-0 bottom-0 h-5 flex items-end justify-center gap-px px-1 pointer-events-none">
            {Array.from({ length: Math.min(40, Math.floor(width / 4)) }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-white/40 rounded-full"
                style={{ height: `${20 + Math.random() * 80}%` }}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-56 bg-[#0d0d14] border-t border-[#1e1e2e] flex flex-col shrink-0">
      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-[#1a1a24] border border-zinc-700 rounded-lg shadow-xl py-1 min-w-40"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={handleSplitClip}
            className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2"
          >
            <Scissors className="w-4 h-4" />
            Split at Playhead
          </button>
          <button
            onClick={handleDuplicateClip}
            className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
          <div className="border-t border-zinc-700 my-1" />
          <button
            onClick={handleDeleteClip}
            className="w-full px-3 py-2 text-left text-sm hover:bg-red-500/20 text-red-400 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

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
          <div className="w-px h-5 bg-zinc-700 mx-2" />
          <span className="text-xs text-zinc-500">
            {formatTimeMarker(currentTime)} / {formatTimeMarker(videoDuration)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
            className="p-1.5 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="w-24 h-1.5 bg-zinc-700 rounded-full relative">
            <div 
              className="absolute h-full bg-violet-500 rounded-full"
              style={{ width: `${((zoom - 0.25) / 2.75) * 100}%` }}
            />
            <input
              type="range"
              min={0.25}
              max={3}
              step={0.25}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
          <button
            onClick={() => setZoom(Math.min(3, zoom + 0.25))}
            className="p-1.5 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-xs text-zinc-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
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
                      <Lock className="w-3 h-3 text-red-400" />
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
            {tracks.map((track) => (
              <div
                key={track.id}
                className={`h-12 border-b border-[#1e1e2e] relative ${
                  !track.visible ? 'opacity-40' : ''
                } ${track.locked ? 'pointer-events-none' : ''}`}
              >
                {/* Video clips */}
                {track.type === 'video' && videoClips.map((clip) => 
                  renderClip(
                    clip, 
                    'video', 
                    { from: '#7c3aed', to: '#5b21b6' },
                    'ring-violet-500'
                  )
                )}

                {/* Audio clips */}
                {track.type === 'audio' && audioClips.map((clip) => 
                  renderClip(
                    clip, 
                    'audio', 
                    { from: '#22c55e', to: '#15803d' },
                    'ring-green-500'
                  )
                )}

                {/* Text overlays */}
                {track.type === 'text' && textOverlays.map((overlay) => 
                  renderClip(
                    { ...overlay, name: overlay.text }, 
                    'text', 
                    { from: '#eab308', to: '#a16207' },
                    'ring-yellow-500'
                  )
                )}
              </div>
            ))}

            {/* Playhead */}
            <div
              className={`absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 ${
                isDraggingPlayhead ? 'cursor-grabbing' : 'cursor-ew-resize'
              }`}
              style={{ left: `${currentTime * pixelsPerSecond}px` }}
              onMouseDown={handlePlayheadDrag}
            >
              <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full shadow-lg" />
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-red-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
