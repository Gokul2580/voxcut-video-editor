import { useEditorStore } from '../../store/editorStore'
import { getDownloadUrl } from '../../services/api'
import {
  Info,
  Clock,
  Maximize2,
  Film,
  FileVideo,
  HardDrive,
  Download
} from 'lucide-react'

export function PropertiesPanel() {
  const { 
    videoFile, 
    videoDuration, 
    selectedClipId, 
    videoClips,
    updateVideoClip,
    jobId
  } = useEditorStore()

  const handleExport = () => {
    if (jobId) {
      window.open(getDownloadUrl(jobId), '_blank')
    } else {
      alert('Please upload a video first')
    }
  }

  const selectedClip = videoClips.find(c => c.id === selectedClipId)

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="p-4 space-y-6">
      {/* File Info */}
      {videoFile && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" />
            File Info
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-zinc-800">
              <span className="text-zinc-500 flex items-center gap-2">
                <FileVideo className="w-4 h-4" />
                Name
              </span>
              <span className="text-zinc-300 truncate max-w-32" title={videoFile.name}>
                {videoFile.name}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-800">
              <span className="text-zinc-500 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Duration
              </span>
              <span className="text-zinc-300">{formatDuration(videoDuration)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-800">
              <span className="text-zinc-500 flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                Size
              </span>
              <span className="text-zinc-300">{formatFileSize(videoFile.size)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-zinc-500 flex items-center gap-2">
                <Film className="w-4 h-4" />
                Type
              </span>
              <span className="text-zinc-300">{videoFile.type || 'video/mp4'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Selected Clip Properties */}
      {selectedClip && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
            <Maximize2 className="w-4 h-4" />
            Clip Properties
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">Start Time</label>
              <input
                type="number"
                step={0.1}
                min={0}
                max={selectedClip.endTime - 0.1}
                value={selectedClip.startTime.toFixed(1)}
                onChange={(e) => updateVideoClip(selectedClip.id, { 
                  startTime: parseFloat(e.target.value) 
                })}
                className="w-full bg-[#1a1a24] border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">End Time</label>
              <input
                type="number"
                step={0.1}
                min={selectedClip.startTime + 0.1}
                max={videoDuration}
                value={selectedClip.endTime.toFixed(1)}
                onChange={(e) => updateVideoClip(selectedClip.id, { 
                  endTime: parseFloat(e.target.value) 
                })}
                className="w-full bg-[#1a1a24] border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">Duration</label>
              <div className="w-full bg-[#1a1a24] border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-400">
                {formatDuration(selectedClip.endTime - selectedClip.startTime)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Settings */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Export Settings</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Resolution</label>
            <select className="w-full bg-[#1a1a24] border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500">
              <option value="1080p">1080p (Full HD)</option>
              <option value="720p">720p (HD)</option>
              <option value="480p">480p (SD)</option>
              <option value="4k">4K (Ultra HD)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Format</label>
            <select className="w-full bg-[#1a1a24] border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500">
              <option value="mp4">MP4</option>
              <option value="webm">WebM</option>
              <option value="mov">MOV</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Quality</label>
            <select className="w-full bg-[#1a1a24] border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <button 
        onClick={handleExport}
        disabled={!jobId}
        className="w-full py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Download className="w-5 h-5" />
        Export Video
      </button>
    </div>
  )
}
