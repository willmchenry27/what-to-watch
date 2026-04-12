const tabs = [
  { id: 'last_week', label: 'Top Rated' },
  { id: 'fresh', label: 'Fresh Drops' },
  { id: 'saved', label: 'Saved' },
]

export default function Header({ activeTab, onTabChange, searchQuery, onSearchChange }) {
  return (
    <header className="border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-4 sm:pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-cream-100">
              What to Watch
            </h1>
            <p className="font-display text-base sm:text-lg md:text-xl italic text-gold-400 mt-1">
              This Week
            </p>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-sm text-cream-300/50 font-body">
              Email Friday &middot; Website refresh Tuesday
            </p>
            <p className="text-xs text-cream-300/30 mt-1">
              Fresh by buzz. Top Rated by scores.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
        <p className="text-xs sm:text-sm text-cream-300/50 mb-3">
          Top Rated looks back over the last 4 weeks. Fresh Drops are new this week.
        </p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-2 sm:p-1.5 sm:bg-white/[0.02] sm:border sm:border-white/10 sm:rounded-lg">
          <nav className="-mx-4 sm:mx-0 px-4 sm:px-0 flex gap-1 overflow-x-auto w-[calc(100%+2rem)] sm:w-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-3.5 sm:px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer whitespace-nowrap min-h-[44px] sm:min-h-0
                  ${activeTab === tab.id
                    ? 'bg-gold-400 text-dark-950 shadow-lg shadow-gold-400/20'
                    : 'text-cream-300/70 hover:text-cream-100 hover:bg-white/5'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="relative w-full sm:w-64">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-300/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search titles, cast, genre..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 min-h-[44px] sm:min-h-0 bg-transparent sm:bg-white/[0.03] border border-white/10 sm:border-transparent rounded-md text-sm text-cream-100 placeholder-cream-300/30 focus:outline-none focus:border-gold-400/40 focus:bg-white/[0.05] focus:ring-1 focus:ring-gold-400/30 transition-colors"
            />
          </div>
        </div>
      </div>
    </header>
  )
}
