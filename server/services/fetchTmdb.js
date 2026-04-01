require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const TMDB_KEY = process.env.TMDB_API_KEY
const BASE = 'https://api.themoviedb.org/3'
const IMG_BASE = 'https://image.tmdb.org/t/p'

// Priority-ordered streaming providers (subscription)
const STREAMING_PRIORITY = [
  { id: 8,   name: 'Netflix',            slug: 'netflix' },
  { id: 9,   name: 'Amazon Prime Video', slug: 'prime' },
  { id: 337, name: 'Disney+',            slug: 'disney-plus' },
  { id: 384, name: 'Max',                slug: 'max' },
  { id: 2,   name: 'Apple TV+',          slug: 'apple-tv-plus' },
  { id: 386, name: 'Peacock',            slug: 'peacock' },
  { id: 531, name: 'Paramount+',         slug: 'paramount-plus' },
]

// Free ad-supported providers
const FREE_PRIORITY = [
  { id: 546, name: 'Tubi',    slug: 'tubi' },
  { id: 613, name: 'Pluto',   slug: 'pluto-tv' },
  { id: 558, name: 'Freevee', slug: 'freevee' },
]

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

function emptyProviderResult() {
  return { platform: null, platform_slug: null, availability: null }
}

function slugifyProviderName(name) {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function pickProvider(providers, priority = []) {
  if (!providers.length) return null

  for (const preferred of priority) {
    const match = providers.find((provider) => provider.provider_id === preferred.id)
    if (match) {
      return { platform: preferred.name, platform_slug: preferred.slug }
    }
  }

  const [provider] = providers
  if (!provider?.provider_name) return null

  return {
    platform: provider.provider_name,
    platform_slug: slugifyProviderName(provider.provider_name),
  }
}

async function fetchWatchProviders(tmdbId, type) {
  try {
    const data = await tmdbFetch(`/${type}/${tmdbId}/watch/providers`)
    const us = data.results?.US
    if (!us) return emptyProviderResult()

    const streaming = pickProvider(us.flatrate || [], STREAMING_PRIORITY)
    if (streaming) return { ...streaming, availability: 'streaming' }

    const free = pickProvider([...(us.free || []), ...(us.ads || [])], FREE_PRIORITY)
    if (free) return { ...free, availability: 'free' }

    const buy = pickProvider(us.buy || [])
    if (buy) return { ...buy, availability: 'buy' }

    const rent = pickProvider(us.rent || [])
    if (rent) return { ...rent, availability: 'rent' }

    return emptyProviderResult()
  } catch {
    return emptyProviderResult()
  }
}

async function fetchExternalIds(tmdbId, type) {
  try {
    const data = await tmdbFetch(`/${type}/${tmdbId}/external_ids`)
    return { imdb_id: data.imdb_id || null }
  } catch {
    return { imdb_id: null }
  }
}

async function enrichPick(pick) {
  const [credits, providers, externalIds] = await Promise.all([
    fetchCredits(pick.tmdb_id, pick.type),
    fetchWatchProviders(pick.tmdb_id, pick.type),
    fetchExternalIds(pick.tmdb_id, pick.type),
  ])

  return {
    ...pick,
    cast: credits.cast,
    director: credits.director,
    platform: providers.platform,
    platform_slug: providers.platform_slug,
    availability: providers.availability,
    imdb_id: externalIds.imdb_id,
  }
}

async function fetchAllTmdbPicks(overrideDateWindow) {
  if (!TMDB_KEY) {
    throw new Error('Missing TMDB_API_KEY in .env')
  }

  const dateWindow = overrideDateWindow || getDateWindow()
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

module.exports = { fetchAllTmdbPicks, getDateWindow, fetchWatchProviders, fetchExternalIds }

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
