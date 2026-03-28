import { useState, useEffect } from 'react'
import { mockPicks, weeklyGuide } from '../data/mockPicks'

const API_BASE = 'http://localhost:3001'

export function useGuide(guideId = null) {
  const [guide, setGuide] = useState(null)
  const [picks, setPicks] = useState(mockPicks)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function fetchGuide() {
      try {
        const endpoint = guideId
          ? `${API_BASE}/api/guide/${guideId}`
          : `${API_BASE}/api/guide/current`
        const res = await fetch(endpoint)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()

        if (!cancelled) {
          setGuide({ id: data.id, week_of: data.week_of, generated_at: data.generated_at })
          setPicks(data.picks)
          setError(null)
        }
      } catch (err) {
        console.warn('API unavailable, using mock data:', err.message)
        if (!cancelled) {
          setGuide(weeklyGuide)
          setPicks(mockPicks)
          setError(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchGuide()
    return () => { cancelled = true }
  }, [guideId])

  return { guide, picks, loading, error }
}
