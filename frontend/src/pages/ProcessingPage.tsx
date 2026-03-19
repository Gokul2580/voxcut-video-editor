import { useEffect, useState } from 'react'
import axios from 'axios'
import { CheckCircle, Loader } from 'lucide-react'

interface ProcessingPageProps {
  jobId: string
  onComplete: () => void
}

interface JobStatusData {
  id: string
  status: string
  progress: number
  created_at: string
  metadata?: Record<string, any>
  error?: string
}

export default function ProcessingPage({ jobId, onComplete }: ProcessingPageProps) {
  const [job, setJob] = useState<JobStatusData | null>(null)
  const [isPolling, setIsPolling] = useState(true)

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/job/${jobId}`)
        setJob(response.data)

        if (response.data.status === 'completed') {
          setIsPolling(false)
          setTimeout(onComplete, 1000)
        }
      } catch (error) {
        console.error('Failed to fetch job status:', error)
      }
    }, 1000)

    return () => clearInterval(pollInterval)
  }, [jobId, onComplete])

  const getProcessingSteps = () => {
    const progress = job?.progress || 0
    return [
      { label: 'Uploading', icon: '📹', active: progress >= 0 },
      { label: 'Analyzing Audio', icon: '🎙️', active: progress >= 20 },
      { label: 'Detecting Takes', icon: '🔍', active: progress >= 40 },
      { label: 'Removing Silence', icon: '🔇', active: progress >= 60 },
      { label: 'Stabilizing Video', icon: '🎬', active: progress >= 80 },
      { label: 'Finalizing', icon: '✨', active: progress >= 95 },
    ]
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">Processing Your Video</h1>
          <p className="text-muted">This may take a few minutes depending on video length</p>
        </div>

        <div className="bg-secondary rounded-lg border border-border p-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-foreground font-semibold">Overall Progress</span>
              <span className="text-primary font-bold">{job?.progress || 0}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-primary to-accent h-3 rounded-full transition-all duration-300"
                style={{ width: `${job?.progress || 0}%` }}
              ></div>
            </div>
          </div>

          {/* Processing Steps */}
          <div className="space-y-4 mb-8">
            {getProcessingSteps().map((step, index) => (
              <div key={index} className="flex items-center gap-4">
                {step.active ? (
                  <>
                    {step.active && job?.progress! >= 100 * ((index + 1) / 6) ? (
                      <CheckCircle className="w-6 h-6 text-accent flex-shrink-0" />
                    ) : (
                      <Loader className="w-6 h-6 text-primary flex-shrink-0 animate-spin" />
                    )}
                  </>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-border flex-shrink-0"></div>
                )}
                <span className={`font-medium ${step.active ? 'text-foreground' : 'text-muted'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* Status Card */}
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
            <p className="text-sm text-muted">Job ID: {jobId}</p>
            <p className="text-lg font-semibold text-foreground mt-2">
              Status: {job?.status || 'Processing...'}
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted">
            Don't close this page while your video is being processed
          </p>
        </div>
      </div>
    </div>
  )
}
