import { useState, useEffect, useCallback } from 'react'
import { apiFetch, API_MISCONFIGURED } from '../lib/api'

export function useGuide(guideId = null) {
  const [guide, setGuide] = useState(null)
  const [picks, setPicks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadCounter, setReloadCounter] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function fetchGuide() {
      if (API_MISCONFIGURED) {
        if (!cancelled) {
          setError('VITE_API_BASE_URL is not configured')
          setLoading(false)
        }
        return
      }
      try {
        const path = guideId ? `/api/guide/${guideId}` : '/api/guide/current'
        const res = await apiFetch(path)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()

        if (!cancelled) {
          setGuide({ id: data.id, week_of: data.week_of, generated_at: data.generated_at })
          setPicks(data.picks)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
          setPicks([])
          setGuide(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchGuide()
    return () => { cancelled = true }
  }, [guideId, reloadCounter])

  const refetch = useCallback(() => setReloadCounter((n) => n + 1), [])

  return { guide, picks, loading, error, refetch }
}
