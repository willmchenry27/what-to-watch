require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const OMDB_KEY = process.env.OMDB_API_KEY
const BASE = 'https://www.omdbapi.com'

/**
 * Single OMDb lookup by IMDb ID. Returns { imdb_score, rt_score } or nulls.
 */
async function omdbLookupById(imdbId) {
  const url = new URL(BASE)
  url.searchParams.set('apikey', OMDB_KEY)
  url.searchParams.set('i', imdbId)

  const res = await fetch(url.toString())
  if (!res.ok) return { imdb_score: null, rt_score: null }

  const data = await res.json()
  if (data.Response === 'False') return { imdb_score: null, rt_score: null }

  const imdb_score = data.imdbRating && data.imdbRating !== 'N/A'
    ? parseFloat(data.imdbRating)
    : null

  let rt_score = null
  if (Array.isArray(data.Ratings)) {
    const rtEntry = data.Ratings.find((r) => r.Source === 'Rotten Tomatoes')
    if (rtEntry && rtEntry.Value) {
      rt_score = parseInt(rtEntry.Value.replace('%', ''), 10)
      if (isNaN(rt_score)) rt_score = null
    }
  }

  return { imdb_score, rt_score }
}

/**
 * Enrich an array of picks with OMDb scores using IMDb ID lookups.
 * Picks must carry `imdb_id` — picks without one are skipped.
 * Batches 5 at a time with a 250ms delay to respect rate limits.
 */
async function enrichWithOmdbScores(picks) {
  if (!OMDB_KEY) throw new Error('Missing OMDB_API_KEY in .env')

  const withId = picks.filter((p) => p.imdb_id)
  console.log(`\nFetching OMDb scores for ${withId.length}/${picks.length} titles (by IMDb ID)...`)
  const enriched = []

  for (let i = 0; i < picks.length; i += 5) {
    const batch = picks.slice(i, i + 5)
    const results = await Promise.all(
      batch.map(async (pick) => {
        if (!pick.imdb_id) return { ...pick, imdb_score: null, rt_score: null }
        const scores = await omdbLookupById(pick.imdb_id)
        return { ...pick, imdb_score: scores.imdb_score, rt_score: scores.rt_score }
      })
    )
    enriched.push(...results)

    const scored = results.filter((r) => r.imdb_score !== null || r.rt_score !== null)
    for (const r of scored) {
      console.log(`  ✓ ${r.title} (${r.imdb_id}) — IMDb: ${r.imdb_score ?? '—'}, RT: ${r.rt_score ?? '—'}%`)
    }

    if (i + 5 < picks.length) {
      await new Promise((r) => setTimeout(r, 250))
    }
  }

  const withScores = enriched.filter((p) => p.imdb_score !== null || p.rt_score !== null)
  console.log(`\nScores found for ${withScores.length}/${picks.length} titles.`)

  return enriched
}

module.exports = { omdbLookupById, enrichWithOmdbScores }
