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
  Minimize,
  RotateCcw,
  Scissors,
  ZoomIn,
  ZoomOut,
  Settings
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
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)

  // Handle video events
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration)
      setIsVideoLoaded(true)
      setVideoError(null)
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    const handleCanPlay = () => {
      setIsVideoLoaded(true)
      setVideoError(null)
    }

    const handleError = (e: Event) => {
      console.error('Video error:', e)
      setVideoError('Failed to load video. Please try again.')
      setIsVideoLoaded(false)
    }

    const handleWaiting = () => {
      // Video is buffering
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('error', handleError)
    video.addEventListener('waiting', handleWaiting)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('error', handleError)
      video.removeEventListener('waiting', handleWaiting)
    }
  }, [setCurrentTime, setVideoDuration, setIsPlaying])

  // Handle play/pause
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isVideoLoaded) return

    if (isPlaying) {
      video.play().catch((err) => {
        console.error('Play failed:', err)
        setIsPlaying(false)
      })
    } else {
      video.pause()
    }
  }, [isPlaying, isVideoLoaded, setIsPlaying])

  // Handle volume changes
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = isMuted ? 0 : volume
  }, [volume, isMuted])

  // Handle playback rate changes
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = playbackRate
  }, [playbackRate])

  // Reset video loaded state when URL changes
  useEffect(() => {
    setIsVideoLoaded(false)
    setVideoError(null)
  }, [videoUrl])

  const togglePlay = () => {
    if (!isVideoLoaded) return
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const time = percentage * videoDuration
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

  const toggleFullscreen = async () => {
    if (!containerRef.current) return
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (err) {
      console.error('Fullscreen error:', err)
    }
  }

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '00:00.00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]
  const progressPercentage = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0

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
          {videoError ? (
            <div className="w-96 h-56 flex items-center justify-center bg-zinc-900 text-zinc-400">
              <p className="text-center p-4">{videoError}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={videoUrl || ''}
              className="max-h-[calc(100vh-350px)] max-w-full"
              onClick={togglePlay}
              playsInline
              crossOrigin="anonymous"
              preload="auto"
            />
          )}
          
          {/* Loading indicator */}
          {!isVideoLoaded && !videoError && videoUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          
          {/* Play/Pause Overlay */}
          {!isPlaying && isVideoLoaded && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
              onClick={togglePlay}
            >
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
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
          <div 
            className="w-full h-2 bg-zinc-700 rounded-full cursor-pointer group"
            onClick={handleProgressClick}
          >
            <div 
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full relative"
              style={{ width: `${progressPercentage}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
            </div>
          </div>
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
              disabled={!isVideoLoaded}
              className="p-3 bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="flex items-center gap-1">
              <Settings className="w-4 h-4 text-zinc-500" />
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
            </div>

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
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
