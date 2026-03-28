import { useState, useEffect } from 'react'

const API_BASE = 'http://localhost:3001'

function formatWeekLabel(weekOf) {
  const d = new Date(weekOf + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ArchiveList({ onSelectGuide, currentGuideId }) {
  const [guides, setGuides] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchGuides() {
      try {
        const res = await fetch(`${API_BASE}/api/guide/list`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled) setGuides(data)
      } catch (err) {
        console.warn('Failed to fetch archive:', err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchGuides()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
        ))}
      </div>
    )
  }

  if (guides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-cream-300/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <p className="text-cream-300/50 text-sm">No past guides yet.</p>
        <p className="text-cream-300/30 text-xs mt-1">Guides are generated every Friday.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {guides.map((g) => {
        const isCurrent = g.id === currentGuideId
        return (
          <button
            key={g.id}
            onClick={() => onSelectGuide(g.id)}
            className={`w-full text-left rounded-xl p-5 border transition-all duration-200 cursor-pointer group
              ${isCurrent
                ? 'bg-gold-400/10 border-gold-400/30'
                : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8'
              }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold text-cream-100">
                  Week of {formatWeekLabel(g.week_of)}
                </h3>
                <p className="text-xs text-cream-300/40 mt-1">
                  {g.pick_count} titles ranked
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isCurrent && (
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-gold-400 bg-gold-400/15 px-2 py-0.5 rounded">
                    Current
                  </span>
                )}
                <svg className="w-5 h-5 text-cream-300/30 group-hover:text-cream-300/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
