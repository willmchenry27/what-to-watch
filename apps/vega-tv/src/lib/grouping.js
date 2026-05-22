/**
 * Split picks into the two visible buckets and apply the production sort.
 *
 * Mirrors the cohort-blending and recency-aware Top Rated sort used by the web
 * client (`src/App.jsx`) and the Friday email (`server/services/emailService.js`).
 *
 *  - Top Rated bucket = `simmered` ∪ (`returning` with `combined_score != null`).
 *    Sorted by `topRatedSortScore`: combined_score minus a recency penalty so
 *    older simmered picks decay relative to newer arrivals; `returning` picks
 *    bypass the decay because their score is tied to the new season, not the
 *    pick's first appearance.
 *  - Fresh Drops bucket = `fresh` ∪ (`returning` with `combined_score == null`).
 */

const RECENCY_WEIGHT_PER_WEEK = 1.5

export function topRatedSortScore(pick, currentWeekStr) {
  if (pick.combined_score == null) return -Infinity
  if (pick.cohort === 'returning' || !pick.first_seen_week || !currentWeekStr) {
    return pick.combined_score
  }
  const ms = new Date(currentWeekStr).getTime() - new Date(pick.first_seen_week).getTime()
  const ageWeeks = Math.max(0, ms / (7 * 24 * 60 * 60 * 1000))
  return pick.combined_score - ageWeeks * RECENCY_WEIGHT_PER_WEEK
}

export function groupPicks(picks, currentWeekStr) {
  if (!Array.isArray(picks)) return { topRated: [], freshDrops: [] }
  const freshDrops = picks
    .filter((p) => p.cohort === 'fresh' || (p.cohort === 'returning' && p.combined_score == null))
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
  const topRated = picks
    .filter((p) => p.cohort === 'simmered' || (p.cohort === 'returning' && p.combined_score != null))
    .filter((p) => p.combined_score != null)
    .sort((a, b) => {
      const delta = topRatedSortScore(b, currentWeekStr) - topRatedSortScore(a, currentWeekStr)
      if (delta !== 0) return delta
      return (b.popularity || 0) - (a.popularity || 0)
    })
  return { topRated, freshDrops }
}
