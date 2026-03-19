import { useState, useRef } from 'react'
import { useEditorStore } from '../../store/editorStore'
import {
  Music,
  Plus,
  Volume2,
  VolumeX,
  Mic,
  Radio,
  Waves,
  Upload,
  Play,
  Pause,
  Trash2
} from 'lucide-react'

interface SoundEffect {
  id: string
  name: string
  category: string
  duration: number
  preview?: string
}

const SOUND_EFFECTS: SoundEffect[] = [
  { id: 'whoosh', name: 'Whoosh', category: 'Transitions', duration: 0.5 },
  { id: 'pop', name: 'Pop', category: 'UI', duration: 0.2 },
  { id: 'click', name: 'Click', category: 'UI', duration: 0.1 },
  { id: 'ding', name: 'Ding', category: 'Notifications', duration: 0.5 },
  { id: 'swoosh', name: 'Swoosh', category: 'Transitions', duration: 0.4 },
  { id: 'bass-drop', name: 'Bass Drop', category: 'Music', duration: 1.0 },
  { id: 'applause', name: 'Applause', category: 'Reactions', duration: 3.0 },
  { id: 'laugh', name: 'Laugh Track', category: 'Reactions', duration: 2.0 },
  { id: 'suspense', name: 'Suspense', category: 'Music', duration: 3.0 },
  { id: 'success', name: 'Success', category: 'Notifications', duration: 0.5 },
]

const MUSIC_TRACKS = [
  { id: 'upbeat-1', name: 'Upbeat Pop', genre: 'Pop', duration: 120 },
  { id: 'chill-1', name: 'Chill Lo-Fi', genre: 'Lo-Fi', duration: 180 },
  { id: 'epic-1', name: 'Epic Cinematic', genre: 'Cinematic', duration: 150 },
  { id: 'electronic-1', name: 'Electronic Beat', genre: 'Electronic', duration: 120 },
  { id: 'acoustic-1', name: 'Acoustic Guitar', genre: 'Acoustic', duration: 90 },
  { id: 'corporate-1', name: 'Corporate Positive', genre: 'Corporate', duration: 120 },
]

export function AudioPanel() {
  const { 
    addAudioClip, 
    audioClips, 
    selectedClipId, 
    updateAudioClip,
    removeAudioClip,
    currentTime,
    videoDuration,
    volume,
    setVolume
  } = useEditorStore()

  const [activeTab, setActiveTab] = useState<'effects' | 'music' | 'voice' | 'upload'>('effects')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isRecording, setIsRecording] = useState(false)
  const [masterVolume, setMasterVolume] = useState(100)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categories = ['all', ...new Set(SOUND_EFFECTS.map(s => s.category))]

  const filteredEffects = selectedCategory === 'all' 
    ? SOUND_EFFECTS 
    : SOUND_EFFECTS.filter(s => s.category === selectedCategory)

  const handleAddSoundEffect = (effect: SoundEffect) => {
    addAudioClip({
      id: `audio-${Date.now()}`,
      name: effect.name,
      src: `/sounds/${effect.id}.mp3`, // Would be actual audio files
      duration: effect.duration,
      startTime: currentTime,
      endTime: currentTime + effect.duration,
      trackIndex: 0
    })
  }

  const handleAddMusic = (track: typeof MUSIC_TRACKS[0]) => {
    addAudioClip({
      id: `music-${Date.now()}`,
      name: track.name,
      src: `/music/${track.id}.mp3`,
      duration: track.duration,
      startTime: currentTime,
      endTime: Math.min(currentTime + track.duration, videoDuration || track.duration),
      trackIndex: 0
    })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('audio/')) return

    const url = URL.createObjectURL(file)
    const audio = new Audio(url)
    
    audio.onloadedmetadata = () => {
      addAudioClip({
        id: `upload-${Date.now()}`,
        name: file.name,
        src: url,
        duration: audio.duration,
        startTime: currentTime,
        endTime: Math.min(currentTime + audio.duration, videoDuration || audio.duration),
        trackIndex: 0
      })
    }
  }

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setIsRecording(true)
      // Recording logic would go here
      console.log('Recording started', stream)
    } catch (err) {
      console.error('Microphone access denied:', err)
    }
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    // Stop recording and save logic
  }

  const selectedAudioClip = audioClips.find(c => c.id === selectedClipId)

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Music className="w-5 h-5 text-green-400" />
        <h2 className="text-lg font-semibold">Audio</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#1a1a24] rounded-lg">
        {[
          { id: 'effects', icon: Waves, label: 'Effects' },
          { id: 'music', icon: Radio, label: 'Music' },
          { id: 'voice', icon: Mic, label: 'Voice' },
          { id: 'upload', icon: Upload, label: 'Upload' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
              activeTab === tab.id
                ? 'bg-green-600 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Master Volume */}
      <div className="p-3 bg-[#1a1a24] rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-zinc-400" />
            <span className="text-sm text-zinc-400">Master Volume</span>
          </div>
          <span className="text-sm text-white">{masterVolume}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={masterVolume}
          onChange={(e) => {
            setMasterVolume(parseInt(e.target.value))
            setVolume(parseInt(e.target.value) / 100)
          }}
          className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:bg-green-500
            [&::-webkit-slider-thumb]:rounded-full"
        />
      </div>

      {/* Sound Effects Tab */}
      {activeTab === 'effects' && (
        <div className="space-y-3">
          {/* Category Filter */}
          <div className="flex gap-1 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-1 rounded-full text-xs capitalize transition-colors ${
                  selectedCategory === cat
                    ? 'bg-green-600 text-white'
                    : 'bg-[#1a1a24] text-zinc-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Effects Grid */}
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {filteredEffects.map((effect) => (
              <button
                key={effect.id}
                onClick={() => handleAddSoundEffect(effect)}
                className="p-3 bg-[#1a1a24] hover:bg-[#252532] rounded-lg text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{effect.name}</span>
                  <Plus className="w-4 h-4 text-zinc-500 group-hover:text-green-400 transition-colors" />
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {effect.duration}s
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Music Tab */}
      {activeTab === 'music' && (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {MUSIC_TRACKS.map((track) => (
            <div
              key={track.id}
              className="p-3 bg-[#1a1a24] hover:bg-[#252532] rounded-lg transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{track.name}</div>
                  <div className="text-xs text-zinc-500">{track.genre} - {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <Play className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleAddMusic(track)}
                    className="p-2 hover:bg-green-500/20 rounded-lg transition-colors text-green-400"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Voice Tab */}
      {activeTab === 'voice' && (
        <div className="space-y-4">
          <div className="p-6 bg-[#1a1a24] rounded-xl flex flex-col items-center gap-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
              isRecording ? 'bg-red-500 animate-pulse' : 'bg-zinc-700'
            }`}>
              <Mic className="w-10 h-10" />
            </div>
            
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            
            <p className="text-xs text-zinc-500 text-center">
              Record voiceover directly in the editor
            </p>
          </div>
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          <div 
            className="p-8 border-2 border-dashed border-zinc-700 rounded-xl flex flex-col items-center gap-3 cursor-pointer hover:border-green-500 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-10 h-10 text-zinc-500" />
            <div className="text-center">
              <p className="text-sm font-medium">Drop audio file here</p>
              <p className="text-xs text-zinc-500">MP3, WAV, AAC supported</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

      {/* Audio Clips List */}
      {audioClips.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-zinc-700">
          <h3 className="text-sm font-medium text-zinc-300">Audio Tracks ({audioClips.length})</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {audioClips.map((clip) => (
              <div
                key={clip.id}
                className={`p-2 rounded-lg flex items-center justify-between transition-colors ${
                  selectedClipId === clip.id
                    ? 'bg-green-600/20 border border-green-500'
                    : 'bg-[#1a1a24] hover:bg-[#252532]'
                }`}
                onClick={() => useEditorStore.getState().setSelectedClipId(clip.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Music className="w-4 h-4 text-green-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm truncate">{clip.name}</div>
                    <div className="text-xs text-zinc-500">
                      {clip.startTime.toFixed(1)}s - {clip.endTime.toFixed(1)}s
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeAudioClip(clip.id)
                  }}
                  className="p-1 hover:bg-red-500/20 rounded text-zinc-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
