import { useEffect, useState } from 'react'
import { fetchCurrentGuide } from '../api/client'

export function useGuide() {
  const [state, setState] = useState({ status: 'loading', guide: null, error: null })

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    setState({ status: 'loading', guide: null, error: null })
    fetchCurrentGuide({ signal: controller.signal })
      .then((guide) => {
        if (!cancelled) setState({ status: 'ready', guide, error: null })
      })
      .catch((err) => {
        if (cancelled || err.name === 'AbortError') return
        setState({ status: 'error', guide: null, error: err.message || 'Unknown error' })
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  return state
}
