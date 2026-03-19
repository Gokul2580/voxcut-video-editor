import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditorStore } from '../../store/editorStore'
import * as api from '../../services/api'
import { Mic, MicOff, Loader2, X, Sparkles, Volume2, AlertCircle, Check, HelpCircle } from 'lucide-react'

// Extended voice command patterns with more natural language support
const VOICE_COMMANDS = [
  // Playback controls
  { pattern: /^(play|start|resume)(\s+video)?$/i, action: 'play', label: 'Play', category: 'playback' },
  { pattern: /^(pause|stop)(\s+video)?$/i, action: 'pause', label: 'Pause', category: 'playback' },
  { pattern: /^mute(\s+audio|\s+sound)?$/i, action: 'mute', label: 'Mute', category: 'playback' },
  { pattern: /^unmute(\s+audio|\s+sound)?$/i, action: 'unmute', label: 'Unmute', category: 'playback' },
  { pattern: /^(go\s+to\s+)?(\d+)\s*(seconds?|s|sec)$/i, action: 'seek', label: 'Seek', category: 'playback' },
  { pattern: /^(skip|jump)\s*(forward|ahead)(\s+(\d+)\s*(seconds?|s)?)?$/i, action: 'skip-forward', label: 'Skip Forward', category: 'playback' },
  { pattern: /^(skip|jump|go)\s*back(ward)?(\s+(\d+)\s*(seconds?|s)?)?$/i, action: 'skip-backward', label: 'Skip Backward', category: 'playback' },
  { pattern: /^(go\s+to\s+)?(start|beginning)$/i, action: 'go-start', label: 'Go to Start', category: 'playback' },
  { pattern: /^(go\s+to\s+)?end$/i, action: 'go-end', label: 'Go to End', category: 'playback' },

  // Speed controls
  { pattern: /^speed\s*up(\s+to\s*(\d+(\.\d+)?)\s*x?)?$/i, action: 'speed-up', label: 'Speed Up', category: 'speed' },
  { pattern: /^slow(\s*er|\s+down)(\s+to\s*(\d+(\.\d+)?)\s*x?)?$/i, action: 'slow-down', label: 'Slow Down', category: 'speed' },
  { pattern: /^(set\s+)?speed\s*(to\s+)?(\d+(\.\d+)?)\s*x?$/i, action: 'set-speed', label: 'Set Speed', category: 'speed' },
  { pattern: /^normal\s+speed$/i, action: 'normal-speed', label: 'Normal Speed', category: 'speed' },
  { pattern: /^(double|2x)\s+speed$/i, action: 'double-speed', label: '2x Speed', category: 'speed' },
  { pattern: /^half\s+speed$/i, action: 'half-speed', label: '0.5x Speed', category: 'speed' },

  // Editing commands
  { pattern: /^(split|cut)\s*(clip|video)?(\s+here)?$/i, action: 'split', label: 'Split Clip', category: 'edit' },
  { pattern: /^delete(\s+(clip|selection|selected))?$/i, action: 'delete', label: 'Delete', category: 'edit' },
  { pattern: /^(duplicate|copy)\s*(clip)?$/i, action: 'duplicate', label: 'Duplicate', category: 'edit' },
  { pattern: /^undo$/i, action: 'undo', label: 'Undo', category: 'edit' },
  { pattern: /^redo$/i, action: 'redo', label: 'Redo', category: 'edit' },
  { pattern: /^select\s+all$/i, action: 'select-all', label: 'Select All', category: 'edit' },
  { pattern: /^(trim|cut)\s+from\s+(\d+)\s*(s|seconds?)?\s+(to|through)\s+(\d+)\s*(s|seconds?)?$/i, action: 'trim-range', label: 'Trim Range', category: 'edit' },
  { pattern: /^(set\s+)?in\s+point$/i, action: 'set-in', label: 'Set In Point', category: 'edit' },
  { pattern: /^(set\s+)?out\s+point$/i, action: 'set-out', label: 'Set Out Point', category: 'edit' },

  // AI features
  { pattern: /^remove\s*(the\s*)?(all\s*)?silence(s)?$/i, action: 'remove-silence', label: 'Remove Silence', category: 'ai' },
  { pattern: /^(stabilize|stabilise)(\s+video)?$/i, action: 'stabilize', label: 'Stabilize', category: 'ai' },
  { pattern: /^(enhance|improve)(\s+video)?$/i, action: 'enhance', label: 'Enhance', category: 'ai' },
  { pattern: /^(add\s+)?(auto\s+)?captions?$/i, action: 'captions', label: 'Add Captions', category: 'ai' },
  { pattern: /^(add\s+)?subtitles?$/i, action: 'captions', label: 'Add Subtitles', category: 'ai' },
  { pattern: /^(denoise|remove\s*noise|clean\s*audio)$/i, action: 'denoise', label: 'Denoise Audio', category: 'ai' },
  { pattern: /^(color\s*correct|fix\s*color(s)?|auto\s*color)$/i, action: 'color-correct', label: 'Color Correct', category: 'ai' },
  { pattern: /^detect\s*scenes?$/i, action: 'scene-detect', label: 'Detect Scenes', category: 'ai' },
  { pattern: /^(smart\s*cut|auto\s*edit)$/i, action: 'smart-cut', label: 'Smart Cut', category: 'ai' },
  { pattern: /^(transcribe|transcription)$/i, action: 'transcribe', label: 'Transcribe', category: 'ai' },

  // Effects and transitions
  { pattern: /^add\s+(a\s+)?fade\s*in$/i, action: 'fade-in', label: 'Fade In', category: 'effects' },
  { pattern: /^add\s+(a\s+)?fade\s*out$/i, action: 'fade-out', label: 'Fade Out', category: 'effects' },
  { pattern: /^add\s+(a\s+)?transition$/i, action: 'add-transition', label: 'Add Transition', category: 'effects' },
  { pattern: /^add\s+(a\s+)?blur$/i, action: 'add-blur', label: 'Add Blur', category: 'effects' },
  { pattern: /^(apply\s+)?(black\s*and\s*white|b&?w|grayscale)$/i, action: 'grayscale', label: 'Grayscale', category: 'effects' },
  { pattern: /^(apply\s+)?sepia$/i, action: 'sepia', label: 'Sepia', category: 'effects' },
  { pattern: /^(apply\s+)?vintage$/i, action: 'vintage', label: 'Vintage', category: 'effects' },

  // Text
  { pattern: /^add\s+(a\s+)?text(\s+saying)?\s*"?(.+)"?$/i, action: 'add-text', label: 'Add Text', category: 'text' },
  { pattern: /^add\s+(a\s+)?title$/i, action: 'add-title', label: 'Add Title', category: 'text' },
  { pattern: /^add\s+(a\s+)?subtitle$/i, action: 'add-subtitle', label: 'Add Subtitle', category: 'text' },

  // Export
  { pattern: /^(export|download|save)(\s+video)?$/i, action: 'export', label: 'Export', category: 'export' },
  { pattern: /^(render|process)(\s+video)?$/i, action: 'render', label: 'Render', category: 'export' },

  // UI Navigation
  { pattern: /^(show|open)\s+(ai\s+)?tools$/i, action: 'show-ai', label: 'Show AI Tools', category: 'ui' },
  { pattern: /^(show|open)\s+effects$/i, action: 'show-effects', label: 'Show Effects', category: 'ui' },
  { pattern: /^(show|open)\s+text$/i, action: 'show-text', label: 'Show Text Panel', category: 'ui' },
  { pattern: /^(show|open)\s+audio$/i, action: 'show-audio', label: 'Show Audio Panel', category: 'ui' },
  { pattern: /^zoom\s*in(\s+timeline)?$/i, action: 'zoom-in', label: 'Zoom In', category: 'ui' },
  { pattern: /^zoom\s*out(\s+timeline)?$/i, action: 'zoom-out', label: 'Zoom Out', category: 'ui' },

  // Help
  { pattern: /^(help|commands|what\s+can\s+(you|i)\s+(say|do))$/i, action: 'help', label: 'Help', category: 'help' },
]

// Command suggestions for help
const COMMAND_EXAMPLES = {
  playback: ['play', 'pause', 'mute', 'go to 30 seconds', 'skip forward 5'],
  speed: ['speed up', 'slow down', 'set speed 1.5x', 'double speed'],
  edit: ['split', 'delete', 'duplicate', 'undo', 'redo'],
  ai: ['remove silence', 'stabilize', 'add captions', 'denoise', 'enhance'],
  effects: ['add fade in', 'add fade out', 'add blur', 'grayscale'],
  text: ['add text "Hello World"', 'add title', 'add subtitle'],
}

export function VoiceCommandBar() {
  const { 
    isListening, 
    setIsListening, 
    voiceTranscript, 
    setVoiceTranscript,
    setIsPlaying,
    isPlaying,
    setVolume,
    volume,
    setPlaybackRate,
    playbackRate,
    setProcessing,
    setProcessingProgress,
    setVideoUrl,
    setCurrentTime,
    currentTime,
    videoDuration,
    jobId,
    selectedClipId,
    removeVideoClip,
    videoClips,
    addVideoClip,
    updateVideoClip,
    setActivePanel,
    setZoom,
    zoom,
    addTextOverlay,
    addEffect
  } = useEditorStore()

  const [isSupported, setIsSupported] = useState(true)
  const [recognizedCommand, setRecognizedCommand] = useState<{ label: string; success: boolean } | null>(null)
  const [isProcessingCommand, setIsProcessingCommand] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const commandTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsSupported(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 3

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim()
        if (event.results[i].isFinal) {
          final = transcript
        } else {
          interim = transcript
        }
      }

      setInterimTranscript(interim)
      
      if (final) {
        setVoiceTranscript(final)
        processVoiceCommand(final)
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsSupported(false)
      }
      if (event.error !== 'no-speech') {
        setIsListening(false)
      }
    }

    recognition.onend = () => {
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.start()
        } catch (e) {
          // Already started or stopped
        }
      }
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
    }
  }, [isListening, setIsListening, setVoiceTranscript])

  const processVoiceCommand = useCallback(async (transcript: string) => {
    const normalizedTranscript = transcript.toLowerCase().trim()
    
    for (const command of VOICE_COMMANDS) {
      const match = normalizedTranscript.match(command.pattern)
      if (match) {
        setRecognizedCommand({ label: command.label, success: true })
        setIsProcessingCommand(true)
        
        try {
          await executeCommand(command.action, match)
          
          // Show success feedback
          if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current)
          commandTimeoutRef.current = setTimeout(() => {
            setRecognizedCommand(null)
            setIsProcessingCommand(false)
            setVoiceTranscript('')
            setInterimTranscript('')
          }, 1500)
        } catch (error) {
          setRecognizedCommand({ label: `Failed: ${command.label}`, success: false })
          setTimeout(() => {
            setRecognizedCommand(null)
            setIsProcessingCommand(false)
          }, 2000)
        }
        
        return
      }
    }

    // No command matched
    setRecognizedCommand({ label: 'Command not recognized', success: false })
    setTimeout(() => {
      setRecognizedCommand(null)
      setVoiceTranscript('')
      setInterimTranscript('')
    }, 2000)
  }, [setVoiceTranscript])

  const executeCommand = async (action: string, match: RegExpMatchArray) => {
    switch (action) {
      // Playback
      case 'play':
        setIsPlaying(true)
        break
      case 'pause':
        setIsPlaying(false)
        break
      case 'mute':
        setVolume(0)
        break
      case 'unmute':
        setVolume(1)
        break
      case 'seek':
        const seekTime = parseInt(match[2])
        setCurrentTime(Math.min(seekTime, videoDuration))
        break
      case 'skip-forward':
        const forwardAmount = match[4] ? parseInt(match[4]) : 5
        setCurrentTime(Math.min(currentTime + forwardAmount, videoDuration))
        break
      case 'skip-backward':
        const backAmount = match[4] ? parseInt(match[4]) : 5
        setCurrentTime(Math.max(currentTime - backAmount, 0))
        break
      case 'go-start':
        setCurrentTime(0)
        break
      case 'go-end':
        setCurrentTime(videoDuration)
        break

      // Speed
      case 'speed-up':
        const newSpeedUp = match[2] ? parseFloat(match[2]) : Math.min(playbackRate + 0.25, 2)
        setPlaybackRate(Math.min(newSpeedUp, 2))
        break
      case 'slow-down':
        const newSpeedDown = match[3] ? parseFloat(match[3]) : Math.max(playbackRate - 0.25, 0.25)
        setPlaybackRate(Math.max(newSpeedDown, 0.25))
        break
      case 'set-speed':
        const setSpeedVal = parseFloat(match[3])
        setPlaybackRate(Math.max(0.25, Math.min(setSpeedVal, 2)))
        break
      case 'normal-speed':
        setPlaybackRate(1)
        break
      case 'double-speed':
        setPlaybackRate(2)
        break
      case 'half-speed':
        setPlaybackRate(0.5)
        break

      // Edit
      case 'split':
        if (selectedClipId) {
          const clip = videoClips.find(c => c.id === selectedClipId)
          if (clip && currentTime > clip.startTime && currentTime < clip.endTime) {
            addVideoClip({
              ...clip,
              id: `clip-${Date.now()}`,
              startTime: currentTime,
            })
            updateVideoClip(selectedClipId, { endTime: currentTime })
          }
        }
        break
      case 'delete':
        if (selectedClipId) {
          removeVideoClip(selectedClipId)
        }
        break
      case 'duplicate':
        if (selectedClipId) {
          const clip = videoClips.find(c => c.id === selectedClipId)
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
        break
      case 'trim-range':
        const trimStart = parseInt(match[2])
        const trimEnd = parseInt(match[5])
        if (jobId) {
          await api.executeCommand(jobId, 'trim', { start: trimStart, end: trimEnd })
        }
        break

      // AI Features
      case 'remove-silence':
        if (jobId) {
          setProcessing(true, 'Removing silence...')
          try {
            await api.removeSilence(jobId)
            await api.pollJobStatus(jobId, (progress) => setProcessingProgress(progress))
            setVideoUrl(api.getProcessedStreamUrl(jobId))
          } finally {
            setProcessing(false)
          }
        }
        break
      case 'stabilize':
        if (jobId) {
          setProcessing(true, 'Stabilizing video...')
          try {
            await api.stabilizeVideo(jobId)
            await api.pollJobStatus(jobId, (progress) => setProcessingProgress(progress))
            setVideoUrl(api.getProcessedStreamUrl(jobId))
          } finally {
            setProcessing(false)
          }
        }
        break
      case 'enhance':
        if (jobId) {
          setProcessing(true, 'Enhancing video...')
          try {
            await api.autoEnhance(jobId, {
              remove_silence: true,
              stabilize: true,
              denoise: true,
              color_correct: true
            })
            await api.pollJobStatus(jobId, (progress) => setProcessingProgress(progress))
            setVideoUrl(api.getProcessedStreamUrl(jobId))
          } finally {
            setProcessing(false)
          }
        }
        break
      case 'captions':
      case 'transcribe':
        if (jobId) {
          setProcessing(true, 'Generating captions...')
          try {
            await api.generateCaptions(jobId)
            await api.pollJobStatus(jobId, (progress) => setProcessingProgress(progress))
          } finally {
            setProcessing(false)
          }
        }
        break
      case 'denoise':
        if (jobId) {
          setProcessing(true, 'Removing audio noise...')
          try {
            await api.denoiseAudio(jobId)
            await api.pollJobStatus(jobId, (progress) => setProcessingProgress(progress))
            setVideoUrl(api.getProcessedStreamUrl(jobId))
          } finally {
            setProcessing(false)
          }
        }
        break
      case 'color-correct':
        if (jobId) {
          setProcessing(true, 'Color correcting...')
          try {
            await api.colorCorrect(jobId)
            await api.pollJobStatus(jobId, (progress) => setProcessingProgress(progress))
            setVideoUrl(api.getProcessedStreamUrl(jobId))
          } finally {
            setProcessing(false)
          }
        }
        break
      case 'scene-detect':
        if (jobId) {
          setProcessing(true, 'Detecting scenes...')
          try {
            await api.detectScenes(jobId)
            await api.pollJobStatus(jobId, (progress) => setProcessingProgress(progress))
          } finally {
            setProcessing(false)
          }
        }
        break

      // Effects
      case 'fade-in':
        addEffect({
          id: `effect-${Date.now()}`,
          type: 'transition',
          name: 'Fade In',
          params: { duration: 1 },
          startTime: currentTime,
          endTime: currentTime + 1
        })
        break
      case 'fade-out':
        addEffect({
          id: `effect-${Date.now()}`,
          type: 'transition',
          name: 'Fade Out',
          params: { duration: 1 },
          startTime: Math.max(0, currentTime - 1),
          endTime: currentTime
        })
        break
      case 'grayscale':
        addEffect({
          id: `effect-${Date.now()}`,
          type: 'filter',
          name: 'Grayscale',
          params: { grayscale: 1 },
          startTime: 0,
          endTime: videoDuration
        })
        break
      case 'sepia':
        addEffect({
          id: `effect-${Date.now()}`,
          type: 'filter',
          name: 'Sepia',
          params: { sepia: 0.8 },
          startTime: 0,
          endTime: videoDuration
        })
        break

      // Text
      case 'add-text':
        const textContent = match[3] || 'Text'
        addTextOverlay({
          id: `text-${Date.now()}`,
          text: textContent.replace(/"/g, ''),
          startTime: currentTime,
          endTime: Math.min(currentTime + 5, videoDuration),
          position: { x: 50, y: 50 },
          style: { fontSize: 32, fontFamily: 'Inter', color: '#ffffff' }
        })
        setActivePanel('text')
        break
      case 'add-title':
        addTextOverlay({
          id: `text-${Date.now()}`,
          text: 'Title',
          startTime: currentTime,
          endTime: Math.min(currentTime + 5, videoDuration),
          position: { x: 50, y: 30 },
          style: { fontSize: 48, fontFamily: 'Inter', color: '#ffffff' }
        })
        setActivePanel('text')
        break

      // Export
      case 'export':
      case 'render':
        if (jobId) {
          window.open(api.getDownloadUrl(jobId), '_blank')
        }
        break

      // UI
      case 'show-ai':
        setActivePanel('ai')
        break
      case 'show-effects':
        setActivePanel('effects')
        break
      case 'show-text':
        setActivePanel('text')
        break
      case 'show-audio':
        setActivePanel('audio')
        break
      case 'zoom-in':
        setZoom(Math.min(zoom + 0.25, 3))
        break
      case 'zoom-out':
        setZoom(Math.max(zoom - 0.25, 0.25))
        break

      // Help
      case 'help':
        setShowHelp(true)
        break

      default:
        console.log(`Unknown command: ${action}`)
    }
  }

  const toggleListening = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
      setVoiceTranscript('')
      setInterimTranscript('')
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (e) {
        console.error('Failed to start recognition:', e)
      }
    }
  }

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-lg text-zinc-500 text-sm">
        <MicOff className="w-4 h-4" />
        <span>Voice unavailable</span>
      </div>
    )
  }

  return (
    <>
      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowHelp(false)}>
          <div className="bg-[#1a1a24] rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Mic className="w-5 h-5 text-violet-400" />
                Voice Commands
              </h2>
              <button onClick={() => setShowHelp(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {Object.entries(COMMAND_EXAMPLES).map(([category, examples]) => (
                <div key={category}>
                  <h3 className="text-sm font-medium text-zinc-400 capitalize mb-2">{category}</h3>
                  <div className="flex flex-wrap gap-2">
                    {examples.map((example, i) => (
                      <span key={i} className="px-2 py-1 bg-[#252532] rounded text-xs text-zinc-300">
                        "{example}"
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Voice Command Display */}
        {(isListening || voiceTranscript || interimTranscript || recognizedCommand) && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
            recognizedCommand 
              ? recognizedCommand.success
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-[#1a1a24] text-zinc-300 border border-zinc-700'
          }`}>
            {isProcessingCommand && recognizedCommand?.success && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            {recognizedCommand ? (
              <>
                {recognizedCommand.success ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>{recognizedCommand.label}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="max-w-48 truncate">
                  {interimTranscript || voiceTranscript || 'Listening...'}
                </span>
              </>
            )}
            {!recognizedCommand && (
              <button
                onClick={() => {
                  setVoiceTranscript('')
                  setInterimTranscript('')
                  setIsListening(false)
                  recognitionRef.current?.stop()
                }}
                className="p-0.5 hover:bg-white/10 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Help Button */}
        <button
          onClick={() => setShowHelp(true)}
          className="p-2 rounded-lg bg-[#1a1a24] text-zinc-400 hover:text-white hover:bg-[#252532] transition-colors"
          title="Voice command help"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Mic Button */}
        <button
          onClick={toggleListening}
          className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
            isListening
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
              : 'bg-[#1a1a24] text-zinc-400 hover:text-white hover:bg-[#252532]'
          }`}
          title={isListening ? 'Stop listening' : 'Voice commands'}
        >
          {isListening ? (
            <>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <Mic className="w-5 h-5" />
            </>
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>
      </div>
    </>
  )
}

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
