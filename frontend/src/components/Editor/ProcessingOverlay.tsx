import { useEditorStore } from '../../store/editorStore'
import { Loader2, Sparkles } from 'lucide-react'

export function ProcessingOverlay() {
  const { processingMessage, processingProgress } = useEditorStore()

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#12121a] rounded-2xl p-8 max-w-md w-full mx-4 border border-zinc-800 shadow-2xl">
        {/* Animation */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-violet-500/30 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-violet-400 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
        </div>

        {/* Message */}
        <h3 className="text-xl font-semibold text-center mb-2">
          {processingMessage || 'Processing...'}
        </h3>
        <p className="text-sm text-zinc-500 text-center mb-6">
          Please wait while we process your video
        </p>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${processingProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Progress</span>
            <span>{Math.round(processingProgress)}%</span>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 p-3 bg-zinc-800/50 rounded-lg">
          <p className="text-xs text-zinc-400 text-center">
            Tip: You can use voice commands to control editing. Try saying "remove silence" or "add captions".
          </p>
        </div>
      </div>
    </div>
  )
}
