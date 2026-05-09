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
  const isCompact = size === 'compact'

  const combinedNumClass = isLarge ? 'text-2xl' : isCompact ? 'text-base' : 'text-xl'
  const combinedLabelClass = isLarge
    ? 'text-[10px] text-cream-300/50'
    : isCompact
      ? 'text-[8px] text-cream-300/40'
      : 'text-[9px] text-cream-300/40'
  const combinedWrapClass = isLarge
    ? 'bg-white/10 backdrop-blur-sm rounded-md px-3 py-1.5'
    : ''
  const subLabelClass = isLarge
    ? 'text-[10px] text-cream-300/50'
    : isCompact
      ? 'text-[8px] text-cream-300/40'
      : 'text-[9px] text-cream-300/40'
  const subNumClass = isLarge ? 'text-sm' : isCompact ? 'text-[10px]' : 'text-[11px]'
  const rowGap = isCompact ? 'gap-2' : 'gap-3'
  const emptyNumClass = isLarge ? 'text-lg' : isCompact ? 'text-sm' : 'text-sm'

  return (
    <div className={`flex items-center ${rowGap}`}>
      {combinedScore != null ? (
        <div className={`flex items-center gap-1.5 ${combinedWrapClass}`}>
          <span className={`font-extrabold ${combinedNumClass} ${combinedColor(combinedScore)}`}>
            {combinedScore}
          </span>
          <span className={`uppercase tracking-wide font-semibold ${combinedLabelClass}`}>
            score
          </span>
        </div>
      ) : (imdbScore != null || rtScore != null) ? (
        <div className={`flex items-center gap-1.5 ${isLarge ? 'bg-white/5 backdrop-blur-sm rounded-md px-3 py-1.5' : ''}`}>
          <span className={`font-semibold ${emptyNumClass} text-white/30`}>
            —
          </span>
        </div>
      ) : null}
      {imdbScore != null && (
        <div className="flex items-center gap-1">
          <span className={`uppercase tracking-wide font-semibold ${subLabelClass}`}>
            IMDb
          </span>
          <span className={`font-semibold ${scoreColor(imdbScore, 10)} ${subNumClass}`}>
            {imdbScore}
          </span>
        </div>
      )}
      {rtScore != null && (
        <div className="flex items-center gap-1">
          <span className={`uppercase tracking-wide font-semibold ${subLabelClass}`}>
            RT
          </span>
          <span className={`font-semibold ${scoreColor(rtScore, 100)} ${subNumClass}`}>
            {rtScore}%
          </span>
        </div>
      )}
    </div>
  )
}
