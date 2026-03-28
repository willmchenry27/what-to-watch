export function calculateCombinedScore(imdbScore, rtScore) {
  const normalizedImdb = imdbScore ? imdbScore * 10 : null
  const normalizedRt = rtScore ?? null

  if (normalizedImdb !== null && normalizedRt !== null) {
    return Math.round((normalizedImdb + normalizedRt) / 2)
  }
  if (normalizedImdb !== null) return Math.round(normalizedImdb)
  if (normalizedRt !== null) return Math.round(normalizedRt)
  return null
}
