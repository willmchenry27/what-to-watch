require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const TMDB_KEY = process.env.TMDB_API_KEY
const BASE = 'https://api.themoviedb.org/3'
const IMG_BASE = 'https://image.tmdb.org/t/p'

// Platform mapping from TMDB watch provider IDs
const PROVIDER_MAP = {
  8: { name: 'Netflix', slug: 'netflix' },
  9: { name: 'Amazon Prime Video', slug: 'amazon-prime' },
  337: { name: 'Disney+', slug: 'disney-plus' },
  350: { name: 'Apple TV+', slug: 'apple-tv-plus' },
  384: { name: 'Max', slug: 'max' },
  1899: { name: 'Max', slug: 'max' },
  15: { name: 'Hulu', slug: 'hulu' },
  386: { name: 'Peacock', slug: 'peacock' },
  531: { name: 'Paramount+', slug: 'paramount-plus' },
  43: { name: 'Starz', slug: 'starz' },
  283: { name: 'Crunchyroll', slug: 'crunchyroll' },
  526: { name: 'AMC+', slug: 'amc-plus' },
}

// TMDB genre ID to name mapping
const MOVIE_GENRES = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
}

const TV_GENRES = {
  10759: 'Action & Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 10762: 'Kids', 9648: 'Mystery',
  10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap',
  10767: 'Talk', 10768: 'War & Politics', 37: 'Western',
}

function getDateWindow() {
  const now = new Date()
  // Find previous Saturday (start of window)
  const day = now.getDay()
  const satOffset = day >= 6 ? day - 6 : day + 1
  const saturday = new Date(now)
  saturday.setDate(now.getDate() - satOffset)

  // Friday = Saturday + 6
  const friday = new Date(saturday)
  friday.setDate(saturday.getDate() + 6)

  const fmt = (d) => d.toISOString().split('T')[0]
  return { gte: fmt(saturday), lte: fmt(friday) }
}

async function tmdbFetch(endpoint, params = {}) {
  const url = new URL(`${BASE}${endpoint}`)
  url.searchParams.set('api_key', TMDB_KEY)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`TMDB ${endpoint} failed: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

const MAX_PAGES = 3

async function fetchNewMovies(dateWindow) {
  console.log(`Fetching movies released ${dateWindow.gte} to ${dateWindow.lte}...`)

  const allResults = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await tmdbFetch('/discover/movie', {
      'primary_release_date.gte': dateWindow.gte,
      'primary_release_date.lte': dateWindow.lte,
      'sort_by': 'popularity.desc',
      'region': 'US',
      'with_release_type': '2|3',
      'with_original_language': 'en',
      'page': page,
    })

    if (page === 1) console.log(`  Found ${data.total_results} movies total`)
    allResults.push(...data.results)
    if (page >= data.total_pages) break
  }

  console.log(`  Fetched ${allResults.length} movies (up to ${MAX_PAGES} pages)`)

  return allResults.map((m) => ({
    tmdb_id: m.id,
    title: m.title,
    year: m.release_date ? parseInt(m.release_date.split('-')[0]) : null,
    type: 'movie',
    genres: (m.genre_ids || []).map((id) => MOVIE_GENRES[id] || 'Other').slice(0, 3),
    description: m.overview || null,
    poster_path: m.poster_path ? `${IMG_BASE}/w500${m.poster_path}` : null,
    backdrop_path: m.backdrop_path ? `${IMG_BASE}/w1280${m.backdrop_path}` : null,
    popularity: m.popularity,
    in_theaters: true,
    tmdb_vote_average: m.vote_average || null,
    tmdb_vote_count: m.vote_count || null,
  }))
}

async function fetchNewTV(dateWindow) {
  console.log(`Fetching TV airing ${dateWindow.gte} to ${dateWindow.lte}...`)

  const allResults = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await tmdbFetch('/discover/tv', {
      'first_air_date.gte': dateWindow.gte,
      'first_air_date.lte': dateWindow.lte,
      'sort_by': 'popularity.desc',
      'watch_region': 'US',
      'with_original_language': 'en',
      'page': page,
    })

    if (page === 1) console.log(`  Found ${data.total_results} TV shows total`)
    allResults.push(...data.results)
    if (page >= data.total_pages) break
  }

  console.log(`  Fetched ${allResults.length} TV shows (up to ${MAX_PAGES} pages)`)

  return allResults.map((t) => ({
    tmdb_id: t.id,
    title: t.name,
    year: t.first_air_date ? parseInt(t.first_air_date.split('-')[0]) : null,
    type: 'tv',
    genres: (t.genre_ids || []).map((id) => TV_GENRES[id] || 'Other').slice(0, 3),
    description: t.overview || null,
    poster_path: t.poster_path ? `${IMG_BASE}/w500${t.poster_path}` : null,
    backdrop_path: t.backdrop_path ? `${IMG_BASE}/w1280${t.backdrop_path}` : null,
    popularity: t.popularity,
    in_theaters: false,
    tmdb_vote_average: t.vote_average || null,
    tmdb_vote_count: t.vote_count || null,
  }))
}

async function fetchCredits(tmdbId, type) {
  try {
    const data = await tmdbFetch(`/${type}/${tmdbId}/credits`)
    const cast = (data.cast || []).slice(0, 5).map((c) => c.name)
    const director = type === 'movie'
      ? (data.crew || []).find((c) => c.job === 'Director')?.name || null
      : null
    return { cast, director }
  } catch {
    return { cast: [], director: null }
  }
}

async function fetchWatchProviders(tmdbId, type) {
  try {
    const data = await tmdbFetch(`/${type}/${tmdbId}/watch/providers`)
    const us = data.results?.US
    if (!us) return { platform: null, platform_slug: null }

    // Check flatrate (streaming) first, then buy/rent
    const providers = us.flatrate || us.buy || us.rent || []
    for (const p of providers) {
      const mapped = PROVIDER_MAP[p.provider_id]
      if (mapped) return { platform: mapped.name, platform_slug: mapped.slug }
    }

    return { platform: null, platform_slug: null }
  } catch {
    return { platform: null, platform_slug: null }
  }
}

async function enrichPick(pick) {
  const [credits, providers] = await Promise.all([
    fetchCredits(pick.tmdb_id, pick.type),
    fetchWatchProviders(pick.tmdb_id, pick.type),
  ])

  // If it's in theaters, label it as such
  let platform = providers.platform
  let platformSlug = providers.platform_slug
  if (pick.in_theaters && !platform) {
    platform = 'In Theaters'
    platformSlug = 'in-theaters'
  }

  return {
    ...pick,
    cast: credits.cast,
    director: credits.director,
    platform,
    platform_slug: platformSlug,
  }
}

async function fetchAllTmdbPicks() {
  if (!TMDB_KEY) {
    throw new Error('Missing TMDB_API_KEY in .env')
  }

  const dateWindow = getDateWindow()
  console.log(`\nTMDB Fetch: Week of ${dateWindow.gte} to ${dateWindow.lte}\n`)

  // Fetch movies and TV in parallel
  const [movies, tvShows] = await Promise.all([
    fetchNewMovies(dateWindow),
    fetchNewTV(dateWindow),
  ])

  // Deduplicate titles that appear in both movie and TV results (keep higher popularity)
  const combined = [...movies, ...tvShows]
  const seen = new Map()
  for (const pick of combined) {
    const key = `${pick.title.toLowerCase().trim()}-${pick.year}`
    const existing = seen.get(key)
    if (!existing || (pick.popularity || 0) > (existing.popularity || 0)) {
      seen.set(key, pick)
    }
  }
  const allPicks = [...seen.values()]
  const dupes = combined.length - allPicks.length
  console.log(`\nTotal: ${allPicks.length} titles (${movies.length} movies, ${tvShows.length} TV${dupes > 0 ? `, ${dupes} duplicates removed` : ''})`)

  // Enrich with credits and watch providers (batch of 5 at a time to be nice to the API)
  console.log('\nEnriching with credits and watch providers...')
  const enriched = []
  for (let i = 0; i < allPicks.length; i += 5) {
    const batch = allPicks.slice(i, i + 5)
    const results = await Promise.all(batch.map(enrichPick))
    enriched.push(...results)
    if (i + 5 < allPicks.length) {
      await new Promise((r) => setTimeout(r, 250)) // small delay between batches
    }
  }

  console.log(`Enriched ${enriched.length} titles.`)
  return { picks: enriched, week_of: dateWindow.gte }
}

module.exports = { fetchAllTmdbPicks, getDateWindow, fetchWatchProviders }

// Run standalone if called directly
if (require.main === module) {
  fetchAllTmdbPicks()
    .then(({ picks, week_of }) => {
      console.log(`\nSample:\n`)
      for (const pick of picks.slice(0, 5)) {
        console.log(`  ${pick.title} (${pick.year}) [${pick.type}]`)
        console.log(`    Genres: ${pick.genres.join(', ')}`)
        console.log(`    Platform: ${pick.platform || 'Unknown'}`)
        console.log(`    Cast: ${pick.cast.slice(0, 3).join(', ') || 'N/A'}`)
        console.log(`    Poster: ${pick.poster_path ? 'Yes' : 'No'}`)
        console.log('')
      }

      const fs = require('fs')
      const outPath = require('path').join(__dirname, '..', 'tmdb-results.json')
      fs.writeFileSync(outPath, JSON.stringify({
        week_of,
        fetched_at: new Date().toISOString(),
        total: picks.length,
        picks,
      }, null, 2))
      console.log(`Full results saved to ${outPath}`)
    })
    .catch((err) => {
      console.error('Fetch failed:', err)
      process.exit(1)
    })
}
