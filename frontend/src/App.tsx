import { useState } from 'react'
import UploadPage from './pages/UploadPage'
import ProcessingPage from './pages/ProcessingPage'
import PreviewPage from './pages/PreviewPage'

type AppState = 'upload' | 'processing' | 'preview'

function App() {
  const [currentPage, setCurrentPage] = useState<AppState>('upload')
  const [jobId, setJobId] = useState<string>('')

  const handleUploadComplete = (newJobId: string) => {
    setJobId(newJobId)
    setCurrentPage('processing')
  }

  const handleProcessingComplete = () => {
    setCurrentPage('preview')
  }

  const handleReset = () => {
    setCurrentPage('upload')
    setJobId('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      {currentPage === 'upload' && <UploadPage onUploadComplete={handleUploadComplete} />}
      {currentPage === 'processing' && <ProcessingPage jobId={jobId} onComplete={handleProcessingComplete} />}
      {currentPage === 'preview' && <PreviewPage jobId={jobId} onReset={handleReset} />}
    </div>
  )
}

export default App
