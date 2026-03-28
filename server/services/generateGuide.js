require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const { fetchAllTmdbPicks, getDateWindow, fetchWatchProviders } = require('./fetchTmdb')
const { enrichWithOmdbScores } = require('./fetchOmdb')
const { getDb } = require('../db/schema')

const MIN_TMDB_VOTES = 10

function calculateCombinedScore(imdbScore, rtScore, tmdbVoteAverage, tmdbVoteCount) {
  const normalizedImdb = imdbScore ? imdbScore * 10 : null
  const normalizedRt = rtScore ?? null
  if (normalizedImdb !== null && normalizedRt !== null) {
    return Math.round((normalizedImdb + normalizedRt) / 2)
  }
  if (normalizedImdb !== null) return Math.round(normalizedImdb)
  if (normalizedRt !== null) return Math.round(normalizedRt)
  // Fallback to TMDB vote_average only if enough votes to be meaningful
  if (tmdbVoteAverage && (tmdbVoteCount || 0) >= MIN_TMDB_VOTES) {
    return Math.round(tmdbVoteAverage * 10)
  }
  return null
}

function rankPicks(picks) {
  return picks
    .sort((a, b) => {
      if (a.combined_score !== null && b.combined_score === null) return -1
      if (a.combined_score === null && b.combined_score !== null) return 1
      if (a.combined_score === null && b.combined_score === null) {
        return (b.popularity || 0) - (a.popularity || 0)
      }
      return b.combined_score - a.combined_score
    })
    .map((p, i) => ({ ...p, rank: i + 1 }))
}

function getPreviousWeekWindow() {
  const dw = getDateWindow()
  const prevSat = new Date(dw.gte + 'T00:00:00')
  prevSat.setDate(prevSat.getDate() - 7)
  const prevFri = new Date(prevSat)
  prevFri.setDate(prevSat.getDate() + 6)
  const fmt = (d) => d.toISOString().split('T')[0]
  return { gte: fmt(prevSat), lte: fmt(prevFri) }
}

function loadPreviousWeekPicks() {
  const db = getDb()
  const prevWindow = getPreviousWeekWindow()
  const prevGuideId = `guide-${prevWindow.gte}`

  const rows = db.prepare(
    "SELECT * FROM picks WHERE guide_id = ? AND cohort = 'fresh' ORDER BY rank ASC"
  ).all(prevGuideId)

  if (rows.length === 0) {
    console.log(`  No previous fresh picks found for ${prevGuideId}`)
    return []
  }

  console.log(`  Found ${rows.length} fresh picks from ${prevGuideId} to simmer`)
  return rows.map((p) => ({
    tmdb_id: p.tmdb_id,
    title: p.title,
    year: p.year,
    type: p.type,
    season: p.season,
    genres: JSON.parse(p.genres),
    description: p.description,
    platform: p.platform,
    platform_slug: p.platform_slug,
    poster_path: p.poster_path,
    backdrop_path: p.backdrop_path,
    cast: JSON.parse(p.cast_list),
    director: p.director,
    in_theaters: Boolean(p.in_theaters),
    popularity: 0,
    tmdb_vote_average: p.tmdb_vote_average,
    tmdb_vote_count: p.tmdb_vote_count,
  }))
}

function saveToDatabase(weekOf, freshPicks, simmeredPicks) {
  const db = getDb()
  const guideId = `guide-${weekOf}`

  const insertGuide = db.prepare(
    'INSERT OR REPLACE INTO weekly_guides (id, week_of, generated_at) VALUES (?, ?, ?)'
  )
  const deletePicks = db.prepare('DELETE FROM picks WHERE guide_id = ?')
  const insertPick = db.prepare(`
    INSERT INTO picks (guide_id, rank, tmdb_id, title, year, type, season, genres, description, imdb_score, rt_score, combined_score, platform, platform_slug, poster_path, backdrop_path, cast_list, director, in_theaters, cohort, tmdb_vote_average, tmdb_vote_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    insertGuide.run(guideId, weekOf, new Date().toISOString())
    deletePicks.run(guideId)

    for (const p of freshPicks) {
      insertPick.run(
        guideId, p.rank, p.tmdb_id || null, p.title, p.year || null,
        p.type, p.season || null, JSON.stringify(p.genres || []),
        p.description || null, p.imdb_score ?? null, p.rt_score ?? null,
        p.combined_score ?? null, p.platform || null, p.platform_slug || null,
        p.poster_path || null, p.backdrop_path || null,
        JSON.stringify(p.cast || []), p.director || null,
        p.in_theaters ? 1 : 0, 'fresh',
        p.tmdb_vote_average ?? null, p.tmdb_vote_count ?? null
      )
    }

    for (const p of simmeredPicks) {
      insertPick.run(
        guideId, p.rank, p.tmdb_id || null, p.title, p.year || null,
        p.type, p.season || null, JSON.stringify(p.genres || []),
        p.description || null, p.imdb_score ?? null, p.rt_score ?? null,
        p.combined_score ?? null, p.platform || null, p.platform_slug || null,
        p.poster_path || null, p.backdrop_path || null,
        JSON.stringify(p.cast || []), p.director || null,
        p.in_theaters ? 1 : 0, 'simmered',
        p.tmdb_vote_average ?? null, p.tmdb_vote_count ?? null
      )
    }
  })

  transaction()
  return guideId
}

async function generateGuide() {
  const startTime = Date.now()
  const errors = []
  console.log('=== Generating Weekly Guide (Simmer Model) ===\n')

  // ── FRESH DROPS: This week's new releases, sorted by popularity ──
  console.log('Step 1: Fetching this week\'s FRESH DROPS from TMDB...')
  let tmdbPicks, week_of
  try {
    const result = await fetchAllTmdbPicks()
    tmdbPicks = result.picks
    week_of = result.week_of
  } catch (err) {
    console.error('PIPELINE FAILURE: TMDB fetch failed:', err.message)
    errors.push(`TMDB fetch: ${err.message}`)
    throw err
  }

  let freshPicks = tmdbPicks
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .map((p, i) => ({
      ...p,
      rank: i + 1,
      imdb_score: null,
      rt_score: null,
      combined_score: null,
    }))

  console.log(`\n  Fresh Drops: ${freshPicks.length} titles (ranked by TMDB popularity)`)
  for (const p of freshPicks.slice(0, 5)) {
    console.log(`    #${p.rank} ${p.title} (${p.year}) — popularity ${p.popularity?.toFixed(1)}`)
  }

  // ── SIMMERED PICKS: Last week's releases, now scored via OMDb ──
  console.log('\nStep 2: Loading last week\'s picks for SIMMERED scoring...')
  const prevPicks = loadPreviousWeekPicks()

  let simmeredPicks = []
  if (prevPicks.length > 0) {
    console.log('\nStep 3: Enriching simmered picks with OMDb scores...')
    let scored
    try {
      scored = await enrichWithOmdbScores(prevPicks)
    } catch (err) {
      console.error('PIPELINE WARNING: OMDb enrichment failed:', err.message)
      errors.push(`OMDb enrichment: ${err.message}`)
      scored = prevPicks // continue with unenriched picks
    }

    // Re-fetch TMDB vote data and watch providers for ALL simmered picks (providers change week to week)
    const withTmdbId = scored.filter((p) => p.tmdb_id)
    if (withTmdbId.length > 0) {
      console.log(`\nRefreshing TMDB data for ${withTmdbId.length} simmered picks...`)
      for (let i = 0; i < withTmdbId.length; i += 5) {
        const batch = withTmdbId.slice(i, i + 5)
        await Promise.all(batch.map(async (p) => {
          const mediaType = p.type === 'tv' ? 'tv' : 'movie'
          // Fetch vote data if missing
          if (p.tmdb_vote_average == null) {
            try {
              const res = await fetch(`https://api.themoviedb.org/3/${mediaType}/${p.tmdb_id}?api_key=${process.env.TMDB_API_KEY}`)
              if (res.ok) {
                const data = await res.json()
                if (data.vote_average) {
                  p.tmdb_vote_average = data.vote_average
                  p.tmdb_vote_count = data.vote_count || null
                }
              }
            } catch {}
          }
          // Always re-fetch watch providers (they change over time)
          const providers = await fetchWatchProviders(p.tmdb_id, p.type)
          if (providers.platform) {
            p.platform = providers.platform
            p.platform_slug = providers.platform_slug
          }
        }))
        if (i + 5 < withTmdbId.length) await new Promise((r) => setTimeout(r, 250))
      }
      const withProviders = withTmdbId.filter((p) => p.platform)
      console.log(`  Refreshed ${withProviders.length}/${withTmdbId.length} picks with providers`)
    }

    simmeredPicks = scored
      .map((p) => ({
        ...p,
        combined_score: calculateCombinedScore(p.imdb_score, p.rt_score, p.tmdb_vote_average, p.tmdb_vote_count),
      }))
    simmeredPicks = rankPicks(simmeredPicks)

    console.log(`\n  Simmered Picks: ${simmeredPicks.length} titles`)
    const withScores = simmeredPicks.filter((p) => p.combined_score !== null)
    console.log(`  Scored: ${withScores.length}/${simmeredPicks.length}`)
    for (const p of simmeredPicks.slice(0, 5)) {
      const score = p.combined_score !== null ? p.combined_score : 'unscored'
      console.log(`    #${p.rank} ${p.title} (${p.year}) — ${score}`)
    }
  } else {
    console.log('  No previous week data — skipping simmered cohort.')
  }

  // ── CROSS-COHORT DEDUP: Remove fresh picks that already appear in simmered ──
  if (simmeredPicks.length > 0) {
    const simmeredTmdbIds = new Set(simmeredPicks.map((p) => p.tmdb_id))
    const freshBefore = freshPicks.length
    freshPicks = freshPicks
      .filter((p) => !simmeredTmdbIds.has(p.tmdb_id))
      .map((p, i) => ({ ...p, rank: i + 1 }))
    if (freshPicks.length < freshBefore) {
      console.log(`  Cross-cohort dedup: removed ${freshBefore - freshPicks.length} fresh picks already in simmered`)
    }
  }

  // ── SAVE ──
  console.log('\nStep 4: Saving to database...')
  const guideId = saveToDatabase(week_of, freshPicks, simmeredPicks)
  const total = freshPicks.length + simmeredPicks.length
  console.log(`Saved ${total} picks (${freshPicks.length} fresh + ${simmeredPicks.length} simmered) as ${guideId}`)

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  if (errors.length > 0) {
    console.warn(`\n⚠ Pipeline completed with ${errors.length} error(s):`)
    errors.forEach((e) => console.warn(`  - ${e}`))
  }
  console.log(`\n=== Guide generation complete! (${elapsed}s) ===`)
  return { guideId, week_of, total }
}

module.exports = { generateGuide, rankPicks, calculateCombinedScore }

// Run standalone
if (require.main === module) {
  generateGuide()
    .then(({ guideId, total }) => {
      console.log(`\nDone. ${total} picks saved. Serve via /api/guide/current`)
    })
    .catch((err) => {
      console.error('Guide generation failed:', err)
      process.exit(1)
    })
}
