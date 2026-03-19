import { useState, useCallback } from 'react'
import axios, { AxiosError } from 'axios'

interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface ApiResponse<T> {
  state: ApiState<T>
  execute: (...args: any[]) => Promise<T>
  reset: () => void
}

export function useApi<T>(
  fn: (...args: any[]) => Promise<T>,
  initialData: T | null = null
): ApiResponse<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: initialData,
    loading: false,
    error: null,
  })

  const execute = useCallback(
    async (...args: any[]) => {
      setState({ data: null, loading: true, error: null })
      try {
        const result = await fn(...args)
        setState({ data: result, loading: false, error: null })
        return result
      } catch (error) {
        const message =
          error instanceof AxiosError
            ? error.response?.data?.error || error.message
            : error instanceof Error
              ? error.message
              : 'An unexpected error occurred'

        setState({ data: null, loading: false, error: message })
        throw error
      }
    },
    [fn]
  )

  const reset = useCallback(() => {
    setState({ data: initialData, loading: false, error: null })
  }, [initialData])

  return { state, execute, reset }
}

export function useJobPolling(jobId: string, interval: number = 1000) {
  const [job, setJob] = useState<any>(null)
  const [isComplete, setIsComplete] = useState(false)

  const fetchJob = useCallback(async () => {
    try {
      const response = await axios.get(`/api/job/${jobId}`)
      setJob(response.data)

      if (response.data.status === 'completed') {
        setIsComplete(true)
      }

      return response.data
    } catch (error) {
      console.error('Failed to fetch job:', error)
      throw error
    }
  }, [jobId])

  return { job, isComplete, fetchJob }
}
