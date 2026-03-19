import { useState, useRef } from 'react'
import { Download, Zap, Settings, HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react'
import axios from 'axios'

interface PreviewPageProps {
  jobId: string
  onReset: () => void
}

interface CommandResult {
  status: 'success' | 'error' | 'info'
  command: string
  timestamp?: Date
}

export default function PreviewPage({ jobId, onReset }: PreviewPageProps) {
  const [command, setCommand] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [commandHistory, setCommandHistory] = useState<CommandResult[]>([])
  const [showHelp, setShowHelp] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleExecuteCommand = async () => {
    if (!command.trim()) return

    setIsExecuting(true)
    try {
      const response = await axios.post(`/api/job/${jobId}/command`, {
        command,
        params: {},
      })

      const result: CommandResult = {
        status: response.data.status || 'success',
        command: response.data.command || command,
        timestamp: new Date(),
      }

      setCommandHistory((prev) => [result, ...prev.slice(0, 9)])
      setCommand('')
    } catch (error) {
      console.error('Command execution failed:', error)
      const errorMsg = error instanceof axios.AxiosError ? error.response?.data?.error : 'Failed to execute command'
      setCommandHistory((prev) => [
        { status: 'error', command: errorMsg || 'Unknown error', timestamp: new Date() },
        ...prev.slice(0, 9),
      ])
    } finally {
      setIsExecuting(false)
    }
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    setDownloadProgress(0)
    try {
      const response = await axios.get(`/api/download/${jobId}`, {
        responseType: 'blob',
        onDownloadProgress: (event) => {
          const progress = event.total ? (event.loaded / event.total) * 100 : 0
          setDownloadProgress(progress)
        },
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `voxcut_${jobId}.mp4`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      alert('Failed to download video. Please try again.')
    } finally {
      setIsDownloading(false)
      setDownloadProgress(0)
    }
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-foreground">Video Preview</h1>
          <button
            onClick={onReset}
            className="px-4 py-2 bg-secondary border border-border rounded-lg text-foreground hover:bg-border transition"
          >
            Edit Another Video
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Video */}
          <div className="lg:col-span-2">
            <div className="bg-secondary rounded-lg overflow-hidden border border-border mb-6">
              <video
                ref={videoRef}
                controls
                className="w-full"
                src={`/api/download/${jobId}`}
              >
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Command Input */}
            <div className="bg-secondary rounded-lg border border-border p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">AI Commands</h3>
                </div>
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="p-1 hover:bg-border rounded transition"
                  title="Show help"
                >
                  <HelpCircle className="w-5 h-5 text-muted hover:text-foreground" />
                </button>
              </div>

              {showHelp && (
                <div className="bg-background rounded-lg p-4 mb-4 border border-primary/20">
                  <p className="text-sm text-foreground font-semibold mb-2">Example commands:</p>
                  <ul className="text-sm text-muted space-y-1">
                    <li>• "Speed up by 1.5x" - Speed up playback</li>
                    <li>• "Slow down to 0.8x" - Slow down playback</li>
                    <li>• "Add zoom effect" - Add zoom animation</li>
                    <li>• "Fade in" / "Fade out" - Add fade effects</li>
                    <li>• "Brighten by 0.2" - Increase brightness</li>
                    <li>• "Add text: Hello" - Add text overlay</li>
                  </ul>
                </div>
              )}

              <p className="text-sm text-muted mb-4">
                Refine your video with natural language commands
              </p>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleExecuteCommand()}
                  placeholder="e.g., 'Speed up by 1.5x', 'Add fade in', 'Brighten by 0.2'"
                  className="flex-1 px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:border-primary"
                />
                <button
                  onClick={handleExecuteCommand}
                  disabled={isExecuting || !command.trim()}
                  className="px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isExecuting ? 'Executing...' : 'Execute'}
                </button>
              </div>

              {/* Command History */}
              {commandHistory.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted mb-2 uppercase font-semibold">Recent Commands</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {commandHistory.map((result, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        {result.status === 'success' && (
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        )}
                        {result.status === 'error' && (
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        )}
                        {result.status === 'info' && (
                          <HelpCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        )}
                        <span className="text-foreground flex-1">{result.command}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Download Button */}
            <div className="bg-gradient-to-br from-primary to-primary-dark rounded-lg p-6 text-center">
              <Download className="w-8 h-8 text-white mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Ready to Download</h3>
              <p className="text-sm text-white/80 mb-4">Your edited video is ready</p>

              {isDownloading && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-white">Downloading...</span>
                    <span className="text-sm font-semibold text-white">{Math.round(downloadProgress)}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div
                      className="bg-white h-2 rounded-full transition-all"
                      style={{ width: `${downloadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full px-4 py-2 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isDownloading ? 'Downloading...' : 'Download Video'}
              </button>
            </div>

            {/* Settings Panel */}
            <div className="bg-secondary rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-accent" />
                Export Settings
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted block mb-2">Video Quality</label>
                  <select className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground">
                    <option>1080p (Recommended)</option>
                    <option>720p (Smaller)</option>
                    <option>4K (Larger)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted block mb-2">Format</label>
                  <select className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground">
                    <option>MP4</option>
                    <option>WebM</option>
                    <option>MOV</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-secondary rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Video Stats</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Silence Removed</span>
                  <span className="text-foreground font-semibold">23s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Best Takes</span>
                  <span className="text-foreground font-semibold">3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Duration Saved</span>
                  <span className="text-foreground font-semibold">12%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Frames Stabilized</span>
                  <span className="text-foreground font-semibold">1,240</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
