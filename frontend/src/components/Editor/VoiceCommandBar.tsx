import { useState, useEffect, useRef } from 'react'
import { useEditorStore } from '../../store/editorStore'
import * as api from '../../services/api'
import { Mic, MicOff, Loader2, X, Sparkles } from 'lucide-react'

// Voice command patterns
const VOICE_COMMANDS = [
  { pattern: /remove\s*(the\s*)?(all\s*)?silence/i, action: 'remove-silence', label: 'Remove Silence' },
  { pattern: /speed\s*up(\s*to\s*(\d+(\.\d+)?)x?)?/i, action: 'speed-up', label: 'Speed Up' },
  { pattern: /slow\s*down(\s*to\s*(\d+(\.\d+)?)x?)?/i, action: 'slow-down', label: 'Slow Down' },
  { pattern: /add\s*(a\s*)?fade\s*in/i, action: 'fade-in', label: 'Add Fade In' },
  { pattern: /add\s*(a\s*)?fade\s*out/i, action: 'fade-out', label: 'Add Fade Out' },
  { pattern: /cut\s*from\s*(\d+)\s*(seconds?)?\s*to\s*(\d+)\s*(seconds?)?/i, action: 'cut-range', label: 'Cut Range' },
  { pattern: /trim\s*(the\s*)?(start|beginning)/i, action: 'trim-start', label: 'Trim Start' },
  { pattern: /trim\s*(the\s*)?(end|ending)/i, action: 'trim-end', label: 'Trim End' },
  { pattern: /split\s*(the\s*)?(clip|video)?/i, action: 'split', label: 'Split Clip' },
  { pattern: /delete\s*(the\s*)?(clip|selection)?/i, action: 'delete', label: 'Delete' },
  { pattern: /undo/i, action: 'undo', label: 'Undo' },
  { pattern: /redo/i, action: 'redo', label: 'Redo' },
  { pattern: /play/i, action: 'play', label: 'Play' },
  { pattern: /pause|stop/i, action: 'pause', label: 'Pause' },
  { pattern: /mute/i, action: 'mute', label: 'Mute' },
  { pattern: /unmute/i, action: 'unmute', label: 'Unmute' },
  { pattern: /stabilize|stabilise/i, action: 'stabilize', label: 'Stabilize Video' },
  { pattern: /enhance|improve/i, action: 'enhance', label: 'Enhance Video' },
  { pattern: /add\s*(auto\s*)?captions?|subtitle/i, action: 'captions', label: 'Add Captions' },
  { pattern: /denoise|remove\s*noise/i, action: 'denoise', label: 'Remove Noise' },
  { pattern: /color\s*correct|fix\s*color/i, action: 'color-correct', label: 'Color Correct' },
  { pattern: /detect\s*scenes?/i, action: 'scene-detect', label: 'Detect Scenes' },
  { pattern: /export|download/i, action: 'export', label: 'Export Video' },
]

export function VoiceCommandBar() {
  const { 
    isListening, 
    setIsListening, 
    voiceTranscript, 
    setVoiceTranscript,
    setIsPlaying,
    setVolume,
    setPlaybackRate,
    setProcessing,
    setProcessingProgress,
    setVideoUrl,
    jobId
  } = useEditorStore()

  const [isSupported, setIsSupported] = useState(true)
  const [recognizedCommand, setRecognizedCommand] = useState<string | null>(null)
  const [isProcessingCommand, setIsProcessingCommand] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    // Check for Web Speech API support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsSupported(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      const last = event.results.length - 1
      const transcript = event.results[last][0].transcript.trim()
      setVoiceTranscript(transcript)

      // Only process final results
      if (event.results[last].isFinal) {
        processVoiceCommand(transcript)
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'not-allowed') {
        setIsSupported(false)
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      if (isListening) {
        // Restart if still supposed to be listening
        try {
          recognition.start()
        } catch (e) {
          // Already started
        }
      }
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
    }
  }, [isListening, setIsListening, setVoiceTranscript])

  const processVoiceCommand = async (transcript: string) => {
    for (const command of VOICE_COMMANDS) {
      const match = transcript.match(command.pattern)
      if (match) {
        setRecognizedCommand(command.label)
        setIsProcessingCommand(true)
        
        // Execute the command
        await executeCommand(command.action, match)
        
        setTimeout(() => {
          setRecognizedCommand(null)
          setIsProcessingCommand(false)
          setVoiceTranscript('')
        }, 2000)
        
        return
      }
    }
  }

  const executeCommand = async (action: string, match: RegExpMatchArray) => {
    switch (action) {
      case 'remove-silence':
        if (jobId) {
          setProcessing(true, 'Removing silence...')
          try {
            await api.removeSilence(jobId)
            await api.pollJobStatus(jobId, (progress) => {
              setProcessingProgress(progress)
            })
            setVideoUrl(api.getProcessedStreamUrl(jobId))
          } catch (e) {
            console.error('Remove silence failed:', e)
          } finally {
            setProcessing(false)
          }
        }
        break
      
      case 'speed-up':
        const speedUp = match[2] ? parseFloat(match[2]) : 1.5
        setPlaybackRate(Math.min(speedUp, 2))
        break
      
      case 'slow-down':
        const speedDown = match[2] ? parseFloat(match[2]) : 0.5
        setPlaybackRate(Math.max(speedDown, 0.25))
        break
      
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
      
      case 'stabilize':
        if (jobId) {
          setProcessing(true, 'Stabilizing video...')
          try {
            await api.stabilizeVideo(jobId)
            await api.pollJobStatus(jobId, (progress) => {
              setProcessingProgress(progress)
            })
            setVideoUrl(api.getProcessedStreamUrl(jobId))
          } catch (e) {
            console.error('Stabilize failed:', e)
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
            await api.pollJobStatus(jobId, (progress) => {
              setProcessingProgress(progress)
            })
            setVideoUrl(api.getProcessedStreamUrl(jobId))
          } catch (e) {
            console.error('Enhance failed:', e)
          } finally {
            setProcessing(false)
          }
        }
        break
      
      case 'captions':
        if (jobId) {
          setProcessing(true, 'Generating captions...')
          try {
            await api.generateCaptions(jobId)
            await api.pollJobStatus(jobId, (progress) => {
              setProcessingProgress(progress)
            })
          } catch (e) {
            console.error('Captions failed:', e)
          } finally {
            setProcessing(false)
          }
        }
        break
      
      case 'denoise':
        if (jobId) {
          setProcessing(true, 'Removing noise...')
          try {
            await api.denoiseAudio(jobId)
            await api.pollJobStatus(jobId, (progress) => {
              setProcessingProgress(progress)
            })
            setVideoUrl(api.getProcessedStreamUrl(jobId))
          } catch (e) {
            console.error('Denoise failed:', e)
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
            await api.pollJobStatus(jobId, (progress) => {
              setProcessingProgress(progress)
            })
            setVideoUrl(api.getProcessedStreamUrl(jobId))
          } catch (e) {
            console.error('Color correct failed:', e)
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
            await api.pollJobStatus(jobId, (progress) => {
              setProcessingProgress(progress)
            })
          } catch (e) {
            console.error('Scene detect failed:', e)
          } finally {
            setProcessing(false)
          }
        }
        break

      case 'export':
        if (jobId) {
          window.open(api.getDownloadUrl(jobId), '_blank')
        }
        break
      
      case 'cut-range':
        const start = parseInt(match[1])
        const end = parseInt(match[3])
        if (jobId) {
          await api.executeCommand(jobId, 'cut', { start, end })
        }
        break
      
      default:
        console.log(`Command: ${action}`)
    }
  }

  const toggleListening = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
      setVoiceTranscript('')
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
    <div className="flex items-center gap-2">
      {/* Voice Command Display */}
      {(isListening || voiceTranscript || recognizedCommand) && (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
          recognizedCommand 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
            : 'bg-[#1a1a24] text-zinc-300 border border-zinc-700'
        }`}>
          {isProcessingCommand && <Loader2 className="w-4 h-4 animate-spin" />}
          {recognizedCommand ? (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{recognizedCommand}</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="max-w-48 truncate">
                {voiceTranscript || 'Listening...'}
              </span>
            </>
          )}
          {!recognizedCommand && (
            <button
              onClick={() => {
                setVoiceTranscript('')
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

      {/* Mic Button */}
      <button
        onClick={toggleListening}
        className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
          isListening
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-[#1a1a24] text-zinc-400 hover:text-white hover:bg-[#252532]'
        }`}
        title={isListening ? 'Stop listening' : 'Voice commands (say "remove silence", "play", "enhance", etc.)'}
      >
        {isListening ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
    </div>
  )
}

// Add TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
