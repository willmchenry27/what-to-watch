require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const OMDB_KEY = process.env.OMDB_API_KEY
const BASE = 'https://www.omdbapi.com'

/**
 * Strip subtitle from a title (everything after ": " or " - " / " – " / " — ")
 */
function stripSubtitle(title) {
  return title.replace(/:\s.*$/, '').replace(/\s[-–—]\s.*$/, '').trim()
}

/**
 * Single OMDb API lookup. Returns { imdb_score, rt_score } or null on miss.
 */
async function omdbLookup(title, year, type) {
  const url = new URL(BASE)
  url.searchParams.set('apikey', OMDB_KEY)
  url.searchParams.set('t', title)
  if (year) url.searchParams.set('y', String(year))
  if (type === 'tv') url.searchParams.set('type', 'series')
  else if (type === 'movie') url.searchParams.set('type', 'movie')

  const res = await fetch(url.toString())
  if (!res.ok) return null

  const data = await res.json()
  if (data.Response === 'False') return null

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
 * Fetch OMDb scores with fuzzy retry strategy:
 * 1. Exact title + year
 * 2. Stripped subtitle + year (if title has subtitle)
 * 3. Stripped subtitle, no year
 * 4. Exact title, no year
 */
async function fetchOmdbScores(title, year, type) {
  if (!OMDB_KEY) throw new Error('Missing OMDB_API_KEY in .env')

  const stripped = stripSubtitle(title)
  const hasSubtitle = stripped !== title

  const strategies = [
    { t: title, y: year, label: 'exact' },
  ]
  if (hasSubtitle) {
    strategies.push({ t: stripped, y: year, label: 'stripped+year' })
    strategies.push({ t: stripped, y: null, label: 'stripped' })
  }
  strategies.push({ t: title, y: null, label: 'no-year' })

  for (const s of strategies) {
    const result = await omdbLookup(s.t, s.y, type)
    if (result) {
      if (s.label !== 'exact') {
        console.log(`  ↳ Matched "${title}" via ${s.label} strategy ("${s.t}")`)
      }
      return result
    }
  }

  console.warn(`  OMDb no match for "${title}" (${year}) after ${strategies.length} attempts`)
  return { imdb_score: null, rt_score: null }
}

/**
 * Enrich an array of picks with OMDb scores.
 * Batches 5 at a time with a 250ms delay to respect rate limits.
 */
async function enrichWithOmdbScores(picks) {
  if (!OMDB_KEY) throw new Error('Missing OMDB_API_KEY in .env')

  console.log(`\nFetching OMDb scores for ${picks.length} titles...`)
  const enriched = []

  for (let i = 0; i < picks.length; i += 5) {
    const batch = picks.slice(i, i + 5)
    const results = await Promise.all(
      batch.map(async (pick) => {
        const scores = await fetchOmdbScores(pick.title, pick.year, pick.type)
        return { ...pick, imdb_score: scores.imdb_score, rt_score: scores.rt_score }
      })
    )
    enriched.push(...results)

    const scored = results.filter((r) => r.imdb_score !== null || r.rt_score !== null)
    for (const r of scored) {
      console.log(`  ✓ ${r.title} — IMDb: ${r.imdb_score ?? '—'}, RT: ${r.rt_score ?? '—'}%`)
    }

    if (i + 5 < picks.length) {
      await new Promise((r) => setTimeout(r, 250))
    }
  }

  const withScores = enriched.filter((p) => p.imdb_score !== null || p.rt_score !== null)
  console.log(`\nScores found for ${withScores.length}/${enriched.length} titles.`)

  return enriched
}

module.exports = { fetchOmdbScores, enrichWithOmdbScores }
