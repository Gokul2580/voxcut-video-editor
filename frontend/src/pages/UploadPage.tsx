import { useState, useRef } from 'react'
import { Upload, Play, AlertCircle } from 'lucide-react'
import axios from 'axios'
import { formatFileSize, isVideoFile } from '../utils/format'

interface UploadPageProps {
  onUploadComplete: (jobId: string) => void
}

export default function UploadPage({ onUploadComplete }: UploadPageProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileSelect = async (file: File) => {
    setError(null)

    // Validate file
    if (!isVideoFile(file)) {
      setError('Please select a valid video file (MP4, WebM, MOV, AVI, or MKV)')
      return
    }

    if (file.size > 2 * 1024 * 1024 * 1024) {
      // 2GB limit
      setError('File is too large. Maximum size is 2GB.')
      return
    }

    setSelectedFile(file)
    setIsUploading(true)
    setUploadProgress(0)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post('/api/upload', formData, {
        onUploadProgress: (event) => {
          const progress = event.total ? (event.loaded / event.total) * 100 : 0
          setUploadProgress(progress)
        },
      })
      onUploadComplete(response.data.job_id)
    } catch (error) {
      console.error('Upload failed:', error)
      const errorMessage =
        error instanceof axios.AxiosError
          ? error.response?.data?.error || 'Upload failed. Please try again.'
          : 'Upload failed. Please try again.'
      setError(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-foreground mb-2">VoxCut</h1>
          <p className="text-xl text-muted">AI-powered video editor for talking head content</p>
        </div>

        <div className="bg-secondary rounded-lg border-2 border-border p-8 md:p-12">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Upload Your Video</h2>
            <p className="text-muted">Drag and drop your video file or click to browse</p>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary'
            }`}
          >
            <Upload className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Drag and drop your video here
            </h3>
            <p className="text-muted mb-4">or click to browse your files</p>
            <p className="text-sm text-muted">Supported formats: MP4, MOV, WebM, MKV</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleInputChange}
            className="hidden"
          />

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-500 font-medium">Error</p>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          {isUploading && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted">Uploading {selectedFile?.name}...</span>
                <span className="text-primary font-semibold">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-muted mt-2">
                {selectedFile && `${formatFileSize(selectedFile.size)}`}
              </p>
            </div>
          )}
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-secondary rounded-lg p-6 border border-border">
            <Play className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-2">Auto-Edit</h3>
            <p className="text-sm text-muted">Automatically remove pauses and junk frames</p>
          </div>
          <div className="bg-secondary rounded-lg p-6 border border-border">
            <Play className="w-8 h-8 text-accent mb-3" />
            <h3 className="font-semibold text-foreground mb-2">Multi-Take Detection</h3>
            <p className="text-sm text-muted">Intelligently find and select the best take</p>
          </div>
          <div className="bg-secondary rounded-lg p-6 border border-border">
            <Play className="w-8 h-8 text-accent-light mb-3" />
            <h3 className="font-semibold text-foreground mb-2">AI Commands</h3>
            <p className="text-sm text-muted">Edit with natural language prompts</p>
          </div>
        </div>
      </div>
    </div>
  )
}
