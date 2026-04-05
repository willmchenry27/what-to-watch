import { useState, useMemo } from 'react'
import Header from './components/Header'
import PickCard from './components/PickCard'
import Footer from './components/Footer'
import ErrorBoundary from './components/ErrorBoundary'
import { SkeletonHero, SkeletonGrid } from './components/SkeletonCard'
import { useGuide } from './hooks/useGuide'

function searchFilter(picks, query) {
  if (!query.trim()) return picks
  const q = query.toLowerCase()
  return picks.filter((p) =>
    p.title.toLowerCase().includes(q) ||
    p.genres.some((g) => g.toLowerCase().includes(q)) ||
    p.cast.some((c) => c.toLowerCase().includes(q)) ||
    (p.director && p.director.toLowerCase().includes(q)) ||
    (p.platform && p.platform.toLowerCase().includes(q))
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('movies')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAllFresh, setShowAllFresh] = useState(false)

  const { guide, picks: allPicks, loading, error, refetch } = useGuide()

  const freshPicks = useMemo(() => allPicks.filter((p) => p.cohort === 'fresh'), [allPicks])
  const simmeredPicks = useMemo(() => allPicks.filter((p) => p.cohort === 'simmered'), [allPicks])

  const isLastWeek = activeTab === 'last_week'
  const filterType = activeTab === 'tv' ? 'tv' : 'movie'

  // Fresh Drops — filtered by type tab + search
  const filteredFresh = useMemo(() => {
    const byType = freshPicks.filter((p) => p.type === filterType)
    return searchFilter(byType, searchQuery)
  }, [freshPicks, filterType, searchQuery])

  // Simmered — search only (no type filter, show all on its own tab)
  const filteredSimmered = useMemo(() => {
    return searchFilter(simmeredPicks, searchQuery)
  }, [simmeredPicks, searchQuery])

  // Heroes
  const heroFresh = filteredFresh[0]
  const remainingFresh = filteredFresh.slice(1)

  const heroSimmered = filteredSimmered.find((p) => p.combined_score != null)
  const remainingSimmered = filteredSimmered.filter((p) => p !== heroSimmered)

  const FIRST_ROW_COUNT = 4
  const FRESH_GRID_LIMIT = 4

  const visibleFresh = showAllFresh ? remainingFresh : remainingFresh.slice(0, FRESH_GRID_LIMIT)
  const hasMoreFresh = remainingFresh.length > FRESH_GRID_LIMIT

  function handleTabChange(tab) {
    setActiveTab(tab)
    setSearchQuery('')
    setShowAllFresh(false)
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        <ErrorBoundary>

          {loading ? (
            <>
              <section className="mb-14">
                <SkeletonHero />
                <div className="mt-10">
                  <div className="h-7 w-36 rounded bg-white/10 animate-pulse mb-6" />
                  <SkeletonGrid count={4} />
                </div>
              </section>
            </>

          ) : error ? (
            /* ═══ ERROR STATE — config missing or API unreachable ═══ */
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
                <svg className="w-8 h-8 text-red-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              {error.startsWith('VITE_API_BASE_URL') ? (
                <>
                  <h2 className="font-display text-xl font-semibold text-cream-100 mb-2">
                    Configuration error
                  </h2>
                  <p className="text-cream-300/60 text-sm max-w-md mb-1">
                    The frontend can't reach the API.
                  </p>
                  <p className="text-cream-300/40 text-xs max-w-md">
                    <code className="bg-white/5 px-1.5 py-0.5 rounded">VITE_API_BASE_URL</code> is not set in this deployment.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="font-display text-xl font-semibold text-cream-100 mb-2">
                    Can't reach the guide
                  </h2>
                  <p className="text-cream-300/60 text-sm max-w-md mb-1">
                    Something went wrong loading this week's picks.
                  </p>
                  <p className="text-cream-300/40 text-xs max-w-md font-mono">{error}</p>
                  <button
                    type="button"
                    onClick={refetch}
                    className="mt-5 px-4 py-2 text-xs rounded-md bg-gold-400 text-dark-950 font-semibold hover:bg-gold-500 cursor-pointer transition-colors"
                  >
                    Retry
                  </button>
                </>
              )}
            </div>

          ) : isLastWeek ? (
            /* ═══ LAST WEEK'S TOP RATED TAB ═══ */
            <>
              <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] sm:text-xs uppercase tracking-widest text-cream-300/50">
                  Scores have settled — ranked by IMDb + Rotten Tomatoes
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {filteredSimmered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-cream-300/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-cream-300/50 text-sm">No scored picks yet.</p>
                  <p className="text-cream-300/30 text-xs mt-1">Scores appear after reviews settle.</p>
                </div>
              ) : (
                <>
                  {heroSimmered && (
                    <section className="mb-8 sm:mb-10">
                      <PickCard pick={heroSimmered} isFeatured />
                    </section>
                  )}

                  {remainingSimmered.length > 0 && (
                    <section>
                      <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <h2 className="font-display text-xl sm:text-2xl font-semibold text-cream-100">
                          Runners-Up
                        </h2>
                        <span className="text-xs text-cream-300/40">
                          {remainingSimmered.length} titles
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 sm:gap-x-4 gap-y-6 sm:gap-y-10">
                        {remainingSimmered.map((pick, i) => (
                          <PickCard key={pick.tmdb_id} pick={pick} isFirstRow={i < FIRST_ROW_COUNT} />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </>

          ) : (
            /* ═══ FRESH DROPS — MOVIES / TV TABS ═══ */
            <>
              <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] sm:text-xs uppercase tracking-widest text-cream-300/50">
                  Week of {guide?.week_of}
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {filteredFresh.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-cream-300/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-cream-300/50 text-sm">No titles found.</p>
                  <button
                    onClick={() => { setActiveTab('movies'); setSearchQuery('') }}
                    className="mt-3 text-xs text-gold-400 hover:text-gold-500 cursor-pointer transition-colors"
                  >
                    Back to Movies
                  </button>
                </div>
              ) : (
                <>
                  {/* Hero — #1 Fresh Drop */}
                  {heroFresh && (
                    <section className="mb-8 sm:mb-10">
                      <PickCard pick={heroFresh} isFeatured hideScores />
                    </section>
                  )}

                  {/* Grid */}
                  {remainingFresh.length > 0 && (
                    <section>
                      <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <div>
                          <h2 className="font-display text-xl sm:text-2xl font-semibold text-cream-100">
                            Fresh Drops
                          </h2>
                          <p className="text-xs text-cream-300/40 mt-1">
                            New this week — sorted by buzz
                          </p>
                        </div>
                        <span className="text-xs text-cream-300/40">
                          {remainingFresh.length} more
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 sm:gap-x-4 gap-y-6 sm:gap-y-10">
                        {visibleFresh.map((pick, i) => (
                          <PickCard key={pick.tmdb_id} pick={pick} isFirstRow={i < FIRST_ROW_COUNT} hideScores />
                        ))}
                      </div>
                      {hasMoreFresh && !showAllFresh && (
                        <div className="mt-6 sm:mt-8 text-center">
                          <button
                            onClick={() => setShowAllFresh(true)}
                            className="text-sm text-gold-400 hover:text-gold-500 cursor-pointer transition-colors"
                          >
                            See all {remainingFresh.length + 1} fresh drops
                          </button>
                        </div>
                      )}
                    </section>
                  )}
                </>
              )}
            </>
          )}

        </ErrorBoundary>
      </main>

      <Footer />
    </div>
  )
}

export default App
