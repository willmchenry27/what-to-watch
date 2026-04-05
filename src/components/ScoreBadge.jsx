function combinedColor(value) {
  if (value == null) return 'text-white/50'
  if (value >= 80) return 'text-emerald-400'
  if (value >= 60) return 'text-amber-400'
  return 'text-red-400'
}

function scoreColor(value, max) {
  if (value == null) return 'text-white/50'
  const threshold = max === 100 ? [80, 60] : [7.5, 6]
  if (value >= threshold[0]) return 'text-emerald-400'
  if (value >= threshold[1]) return 'text-amber-400'
  return 'text-red-400'
}

export default function ScoreBadge({ imdbScore, rtScore, combinedScore, size = 'sm' }) {
  if (combinedScore == null && imdbScore == null && rtScore == null) return null

  const isLarge = size === 'lg'

  return (
    <div className="flex items-center gap-3">
      {combinedScore != null ? (
        <div className={`flex items-center gap-1.5 ${isLarge ? 'bg-white/10 backdrop-blur-sm rounded-md px-3 py-1.5' : ''}`}>
          <span className={`font-extrabold ${isLarge ? 'text-2xl' : 'text-xl'} ${combinedColor(combinedScore)}`}>
            {combinedScore}
          </span>
          <span className={`uppercase tracking-wide font-semibold ${isLarge ? 'text-[10px] text-cream-300/50' : 'text-[9px] text-cream-300/40'}`}>
            score
          </span>
        </div>
      ) : (imdbScore != null || rtScore != null) ? (
        <div className={`flex items-center gap-1.5 ${isLarge ? 'bg-white/5 backdrop-blur-sm rounded-md px-3 py-1.5' : ''}`}>
          <span className={`font-semibold ${isLarge ? 'text-lg' : 'text-sm'} text-white/30`}>
            —
          </span>
        </div>
      ) : null}
      {imdbScore != null && (
        <div className="flex items-center gap-1">
          <span className={`uppercase tracking-wide font-semibold ${isLarge ? 'text-[10px] text-cream-300/50' : 'text-[9px] text-cream-300/40'}`}>
            IMDb
          </span>
          <span className={`font-semibold ${scoreColor(imdbScore, 10)} ${isLarge ? 'text-sm' : 'text-[11px]'}`}>
            {imdbScore}
          </span>
        </div>
      )}
      {rtScore != null && (
        <div className="flex items-center gap-1">
          <span className={`uppercase tracking-wide font-semibold ${isLarge ? 'text-[10px] text-cream-300/50' : 'text-[9px] text-cream-300/40'}`}>
            RT
          </span>
          <span className={`font-semibold ${scoreColor(rtScore, 100)} ${isLarge ? 'text-sm' : 'text-[11px]'}`}>
            {rtScore}%
          </span>
        </div>
      )}
    </div>
  )
}
