import { useRef, useEffect, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  Scissors,
  ZoomIn,
  ZoomOut
} from 'lucide-react'

export function VideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    videoUrl,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    volume,
    setVolume,
    playbackRate,
    setPlaybackRate,
    videoDuration,
    setVideoDuration
  } = useEditorStore()

  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [previewScale, setPreviewScale] = useState(1)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('ended', handleEnded)
    }
  }, [setCurrentTime, setVideoDuration, setIsPlaying])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false))
    } else {
      video.pause()
    }
  }, [isPlaying, setIsPlaying])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = isMuted ? 0 : volume
  }, [volume, isMuted])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = playbackRate
  }, [playbackRate])

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value)
    setVolume(vol)
    if (vol > 0) setIsMuted(false)
  }

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, currentTime - 5)
    }
  }

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoDuration, currentTime + 5)
    }
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]

  return (
    <div 
      ref={containerRef}
      className="flex-1 flex flex-col bg-[#08080c] relative"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !isPlaying && setShowControls(true)}
    >
      {/* Video Container */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div 
          className="relative bg-black rounded-lg overflow-hidden shadow-2xl"
          style={{ transform: `scale(${previewScale})` }}
        >
          <video
            ref={videoRef}
            src={videoUrl || ''}
            className="max-h-[calc(100vh-350px)] max-w-full"
            onClick={togglePlay}
          />
          
          {/* Play/Pause Overlay */}
          {!isPlaying && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
              onClick={togglePlay}
            >
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-10 h-10 text-white ml-1" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Scale Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-[#12121a]/90 backdrop-blur-sm rounded-lg p-1">
        <button
          onClick={() => setPreviewScale(Math.max(0.5, previewScale - 0.1))}
          className="p-2 hover:bg-white/10 rounded transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs text-zinc-400 w-12 text-center">
          {Math.round(previewScale * 100)}%
        </span>
        <button
          onClick={() => setPreviewScale(Math.min(2, previewScale + 0.1))}
          className="p-2 hover:bg-white/10 rounded transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Controls Bar */}
      <div className={`bg-[#12121a] border-t border-[#1e1e2e] p-3 transition-opacity ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* Progress Bar */}
        <div className="mb-3">
          <input
            type="range"
            min={0}
            max={videoDuration || 100}
            step={0.01}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:bg-violet-500
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-all
              [&::-webkit-slider-thumb]:hover:scale-125"
            style={{
              background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(currentTime / videoDuration) * 100}%, #3f3f46 ${(currentTime / videoDuration) * 100}%, #3f3f46 100%)`
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={skipBackward}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Skip back 5s"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            
            <button
              onClick={togglePlay}
              className="p-3 bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>
            
            <button
              onClick={skipForward}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Skip forward 5s"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            {/* Time Display */}
            <div className="text-sm font-mono text-zinc-400 ml-2">
              <span className="text-white">{formatTime(currentTime)}</span>
              <span className="mx-1">/</span>
              <span>{formatTime(videoDuration)}</span>
            </div>
          </div>

          {/* Center Controls */}
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Split clip">
              <Scissors className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Undo">
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Playback Speed */}
            <select
              value={playbackRate}
              onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
              className="bg-[#1a1a24] border border-zinc-700 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-violet-500"
            >
              {playbackRates.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}x
                </option>
              ))}
            </select>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:bg-white
                  [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
