export default function Footer() {
  return (
    <footer className="border-t border-white/5 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-display text-lg font-semibold text-cream-100">
              What to Watch
            </p>
            <p className="text-xs text-cream-300/40 mt-1">
              Ranked by critics, updated every Friday.
            </p>
          </div>
          <div className="text-xs text-cream-300/30">
            Powered by IMDb + Rotten Tomatoes
          </div>
        </div>
      </div>
    </footer>
  )
}
