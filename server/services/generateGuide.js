require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const { fetchAllTmdbPicks, fetchReturningSeasons, fetchSeasonRating, getDateWindow, fetchWatchProviders, fetchExternalIds } = require('./fetchTmdb')
const { enrichWithOmdbScores } = require('./fetchOmdb')
const { getDb } = require('../db/schema')

const MIN_TMDB_VOTES = 5
const SIMMER_WEEKS = 4
const RETURNING_WEEKS = 12
const SEASON_VOTES_THRESHOLD = 50
const RECENCY_WEIGHT_PER_WEEK = 1.5

function topRatedSortScore(pick, currentWeekStr) {
  if (pick.combined_score == null) return -Infinity
  if (pick.cohort === 'returning' || !pick.first_seen_week) return pick.combined_score
  const ms = new Date(currentWeekStr).getTime() - new Date(pick.first_seen_week).getTime()
  const ageWeeks = Math.max(0, ms / (7 * 24 * 60 * 60 * 1000))
  return pick.combined_score - ageWeeks * RECENCY_WEIGHT_PER_WEEK
}

function calculateCombinedScore(imdbScore, rtScore, tmdbVoteAverage, tmdbVoteCount) {
  const normalizedImdb = imdbScore ? imdbScore * 10 : null
  const normalizedRt = rtScore ?? null
  if (normalizedImdb !== null && normalizedRt !== null) {
    return Math.round((normalizedImdb + normalizedRt) / 2)
  }
  if (normalizedImdb !== null) return Math.round(normalizedImdb)
  if (normalizedRt !== null) return Math.round(normalizedRt)
  if (tmdbVoteAverage && (tmdbVoteCount || 0) >= MIN_TMDB_VOTES) {
    return Math.round(tmdbVoteAverage * 10)
  }
  return null
}

async function scoreReturningPick(pick) {
  let seasonRating = { vote_average: null, vote_count: 0 }
  if (pick.tmdb_id && pick.season) {
    seasonRating = await fetchSeasonRating(pick.tmdb_id, pick.season)
  }
  const seasonVoteAverage = seasonRating.vote_average
  const seasonVoteCount = seasonRating.vote_count

  if (seasonVoteCount >= SEASON_VOTES_THRESHOLD && seasonVoteAverage != null) {
    return {
      ...pick,
      season_vote_average: seasonVoteAverage,
      season_vote_count: seasonVoteCount,
      combined_score: Math.round(seasonVoteAverage * 10),
      score_source: 'season',
    }
  }

  const seriesScore = calculateCombinedScore(
    pick.imdb_score,
    pick.rt_score,
    pick.tmdb_vote_average,
    pick.tmdb_vote_count,
  )
  return {
    ...pick,
    season_vote_average: seasonVoteAverage,
    season_vote_count: seasonVoteCount,
    combined_score: seriesScore,
    score_source: seriesScore != null ? 'series' : null,
  }
}

function hasUsableImage(p) {
  return Boolean(p.backdrop_path || p.poster_path)
}

function hasMeaningfulDescription(p) {
  return Boolean(p.description && p.description.trim().length >= 40)
}

function hasGenres(p) {
  return Array.isArray(p.genres) ? p.genres.length > 0 : Boolean(p.genres)
}

function isFreshDropCandidate(p) {
  return Boolean(p.title) && hasMeaningfulDescription(p) && hasGenres(p) && hasUsableImage(p) && (!p.in_theaters || p.platform)
}

function isTopRatedCandidate(p) {
  return p.combined_score !== null && p.combined_score !== undefined
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

function getPastGuideIds(weeks) {
  const dw = getDateWindow()
  const fmt = (d) => d.toISOString().split('T')[0]
  const ids = []
  for (let w = 1; w <= weeks; w++) {
    const sat = new Date(dw.gte + 'T00:00:00')
    sat.setDate(sat.getDate() - (w * 7))
    ids.push(`guide-${fmt(sat)}`)
  }
  return ids
}

function getSimmeredGuideIds() {
  return getPastGuideIds(SIMMER_WEEKS)
}

async function loadSimmeredCandidates() {
  const db = await getDb()
  const guideIds = getSimmeredGuideIds()

  const allRows = []
  for (const guideId of guideIds) {
    const result = await db.execute({
      sql: "SELECT * FROM picks WHERE guide_id = ? AND cohort = 'fresh' ORDER BY rank ASC",
      args: [guideId],
    })
    const rows = result.rows
    if (rows.length > 0) {
      console.log(`  Found ${rows.length} fresh picks from ${guideId}`)
      allRows.push(...rows.map((r) => ({ ...r, _guideId: guideId })))
    } else {
      console.log(`  No fresh picks found for ${guideId}`)
    }
  }

  if (allRows.length === 0) return []

  // Deduplicate by tmdb_id — keep the newer row's data, but track the OLDEST
  // guide_id seen so first_seen_week reflects the original fresh appearance.
  const seen = new Map()
  const oldestGuideId = new Map()
  for (const row of allRows) {
    if (!seen.has(row.tmdb_id)) {
      seen.set(row.tmdb_id, row)
    }
    const prev = oldestGuideId.get(row.tmdb_id)
    if (!prev || row._guideId < prev) {
      oldestGuideId.set(row.tmdb_id, row._guideId)
    }
  }
  const deduped = [...seen.values()]
  const dupes = allRows.length - deduped.length
  if (dupes > 0) console.log(`  Deduped: removed ${dupes} titles appearing in multiple weeks`)
  console.log(`  Total simmer candidates: ${deduped.length}`)

  return deduped.map((p) => ({
    tmdb_id: p.tmdb_id,
    imdb_id: p.imdb_id || null,
    title: p.title,
    year: p.year,
    type: p.type,
    season: p.season,
    genres: JSON.parse(p.genres),
    description: p.description,
    platform: p.platform,
    platform_slug: p.platform_slug,
    availability: p.availability,
    poster_path: p.poster_path,
    backdrop_path: p.backdrop_path,
    cast: JSON.parse(p.cast_list),
    director: p.director,
    in_theaters: Boolean(p.in_theaters),
    popularity: 0,
    tmdb_vote_average: p.tmdb_vote_average,
    tmdb_vote_count: p.tmdb_vote_count,
    // Use the OLDEST guide_id for this tmdb_id so age reflects the original
    // fresh appearance, not the most recent re-save.
    first_seen_week: oldestGuideId.get(p.tmdb_id).replace(/^guide-/, ''),
  }))
}

async function loadReturningCandidates() {
  const db = await getDb()
  const guideIds = getPastGuideIds(RETURNING_WEEKS)

  const allRows = []
  for (const guideId of guideIds) {
    const result = await db.execute({
      sql: "SELECT * FROM picks WHERE guide_id = ? AND cohort = 'returning' ORDER BY rank ASC",
      args: [guideId],
    })
    if (result.rows.length > 0) {
      console.log(`  Found ${result.rows.length} returning picks from ${guideId}`)
      allRows.push(...result.rows)
    }
  }

  if (allRows.length === 0) return []

  // Dedup by (tmdb_id, season) — keep the newer row (older guide IDs come last)
  const seen = new Map()
  for (const row of allRows) {
    const key = `${row.tmdb_id}-${row.season}`
    if (!seen.has(key)) seen.set(key, row)
  }
  const deduped = [...seen.values()]
  const dupes = allRows.length - deduped.length
  if (dupes > 0) console.log(`  Deduped: removed ${dupes} returning picks across weeks`)
  console.log(`  Total returning candidates to re-score: ${deduped.length}`)

  return deduped.map((p) => ({
    tmdb_id: p.tmdb_id,
    imdb_id: p.imdb_id || null,
    title: p.title,
    year: p.year,
    type: p.type,
    season: p.season,
    genres: JSON.parse(p.genres),
    description: p.description,
    platform: p.platform,
    platform_slug: p.platform_slug,
    availability: p.availability,
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

async function saveToDatabase(weekOf, freshPicks, simmeredPicks, returningPicks = []) {
  const db = await getDb()
  const guideId = `guide-${weekOf}`

  const pickSql = `INSERT INTO picks (guide_id, rank, tmdb_id, imdb_id, title, year, type, season, genres, description, imdb_score, rt_score, combined_score, platform, platform_slug, availability, poster_path, backdrop_path, cast_list, director, in_theaters, cohort, tmdb_vote_average, tmdb_vote_count, season_vote_average, season_vote_count, score_source, first_seen_week)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

  function pickArgs(p, cohort) {
    return [
      guideId, p.rank, p.tmdb_id || null, p.imdb_id || null, p.title, p.year || null,
      p.type, p.season || null, JSON.stringify(p.genres || []),
      p.description || null, p.imdb_score ?? null, p.rt_score ?? null,
      p.combined_score ?? null, p.platform || null, p.platform_slug || null,
      p.availability || null, p.poster_path || null, p.backdrop_path || null,
      JSON.stringify(p.cast || []), p.director || null,
      p.in_theaters ? 1 : 0, cohort,
      p.tmdb_vote_average ?? null, p.tmdb_vote_count ?? null,
      p.season_vote_average ?? null, p.season_vote_count ?? null, p.score_source ?? null,
      p.first_seen_week || weekOf,
    ]
  }

  const statements = [
    { sql: 'INSERT OR REPLACE INTO weekly_guides (id, week_of, generated_at) VALUES (?, ?, ?)', args: [guideId, weekOf, new Date().toISOString()] },
    { sql: 'DELETE FROM picks WHERE guide_id = ?', args: [guideId] },
    ...freshPicks.map((p) => ({ sql: pickSql, args: pickArgs(p, 'fresh') })),
    ...simmeredPicks.map((p) => ({ sql: pickSql, args: pickArgs(p, 'simmered') })),
    ...returningPicks.map((p) => ({ sql: pickSql, args: pickArgs(p, 'returning') })),
  ]

  await db.batch(statements, 'write')
  return guideId
}

async function generateGuide() {
  const startTime = Date.now()
  const errors = []
  console.log('=== Generating Weekly Guide (4-Week Simmer Model) ===\n')

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

  const freshBeforeQuality = tmdbPicks.filter((p) => !p.in_theaters || p.platform).length
  let freshPicks = tmdbPicks
    .filter(isFreshDropCandidate)
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .map((p, i) => ({
      ...p,
      rank: i + 1,
      imdb_score: null,
      rt_score: null,
      combined_score: null,
    }))

  const freshDropped = freshBeforeQuality - freshPicks.length
  if (freshDropped > 0) console.log(`  Fresh quality filter: removed ${freshDropped} weak picks (missing image, description, or genres)`)
  console.log(`\n  Fresh Drops: ${freshPicks.length} titles (ranked by TMDB popularity)`)
  for (const p of freshPicks.slice(0, 5)) {
    console.log(`    #${p.rank} ${p.title} (${p.year}) — popularity ${p.popularity?.toFixed(1)}`)
  }

  // ── RETURNING SEASONS: New seasons (S2+) airing this week + past 12 weeks of tracked picks ──
  console.log('\nStep 1.5: Fetching RETURNING SEASONS from TMDB...')
  let returningPicks = []
  try {
    const dw = getDateWindow()
    const freshTmdbIds = new Set(freshPicks.map((p) => p.tmdb_id))

    // (a) New season premieres airing this week
    const returningRaw = await fetchReturningSeasons(dw)
    const newReturning = returningRaw
      .filter(isFreshDropCandidate)
      .filter((p) => !freshTmdbIds.has(p.tmdb_id))
    console.log(`  This week's new season premieres: ${newReturning.length}`)

    // (b) Past 12 weeks of tracked returning picks
    console.log('\nStep 1.6: Loading past returning picks for weekly re-scoring...')
    const pastReturning = await loadReturningCandidates()

    // (c) Merge new + past, dedup by (tmdb_id, season), prefer the newer entry
    const merged = new Map()
    for (const p of newReturning) merged.set(`${p.tmdb_id}-${p.season}`, p)
    for (const p of pastReturning) {
      const key = `${p.tmdb_id}-${p.season}`
      if (!merged.has(key)) merged.set(key, p)
    }
    const allReturning = [...merged.values()].filter((p) => !freshTmdbIds.has(p.tmdb_id))

    // (d) Refresh providers for the merged set (covers both new and past)
    if (allReturning.length > 0) {
      console.log(`  Refreshing providers for ${allReturning.length} returning picks...`)
      for (let i = 0; i < allReturning.length; i += 5) {
        const batch = allReturning.slice(i, i + 5)
        await Promise.all(batch.map(async (p) => {
          const providers = await fetchWatchProviders(p.tmdb_id, p.type)
          p.platform = providers.platform
          p.platform_slug = providers.platform_slug
          p.availability = providers.availability
        }))
        if (i + 5 < allReturning.length) await new Promise((r) => setTimeout(r, 250))
      }
    }

    // (e) Drop in-theaters/no-platform picks AFTER provider refresh
    const filteredReturning = allReturning.filter((p) => !p.in_theaters || p.platform)

    // (f) OMDb-enrich the merged set ONCE so both new and past picks get series-level scores
    let omdbEnriched = filteredReturning
    if (filteredReturning.length > 0) {
      console.log(`  Fetching OMDb series-level scores for ${filteredReturning.length} returning picks...`)
      try {
        omdbEnriched = await enrichWithOmdbScores(filteredReturning)
      } catch (err) {
        console.error('  PIPELINE WARNING: OMDb enrich for returning failed:', err.message)
        errors.push(`OMDb enrich (returning): ${err.message}`)
      }
    }

    // (g) Score each via shared helper (series-level OMDb + season-level TMDB)
    console.log(`  Scoring ${omdbEnriched.length} returning picks...`)
    const scored = []
    for (let i = 0; i < omdbEnriched.length; i += 5) {
      const batch = omdbEnriched.slice(i, i + 5)
      const results = await Promise.all(batch.map(scoreReturningPick))
      scored.push(...results)
      if (i + 5 < omdbEnriched.length) await new Promise((r) => setTimeout(r, 250))
    }

    returningPicks = scored
      .sort((a, b) => {
        const aScore = a.combined_score ?? -1
        const bScore = b.combined_score ?? -1
        if (aScore !== bScore) return bScore - aScore
        return (b.popularity || 0) - (a.popularity || 0)
      })
      .map((p, i) => ({ ...p, rank: i + 1 }))

    console.log(`  Returning Seasons: ${returningPicks.length} titles total`)
    for (const p of returningPicks.slice(0, 5)) {
      const score = p.combined_score != null ? p.combined_score : 'unscored'
      const src = p.score_source ? ` (${p.score_source})` : ''
      console.log(`    #${p.rank} ${p.title} S${p.season} — ${score}${src}`)
    }
  } catch (err) {
    console.error('PIPELINE WARNING: Returning seasons step failed:', err.message)
    errors.push(`Returning seasons: ${err.message}`)
  }

  // ── SIMMERED PICKS: Last 4 weeks' releases, now scored ──
  console.log('\nStep 2: Loading picks from past 4 weeks for SIMMERED scoring...')
  const prevPicks = await loadSimmeredCandidates()

  let simmeredPicks = []
  if (prevPicks.length > 0) {
    console.log('\nStep 3: Enriching simmered picks with OMDb scores (by IMDb ID)...')
    let scored
    try {
      scored = await enrichWithOmdbScores(prevPicks)
    } catch (err) {
      console.error('PIPELINE WARNING: OMDb enrichment failed:', err.message)
      errors.push(`OMDb enrichment: ${err.message}`)
      scored = prevPicks // continue with unenriched picks
    }

    // Re-fetch TMDB vote data, watch providers, and external IDs for ALL simmered picks
    const withTmdbId = scored.filter((p) => p.tmdb_id)
    if (withTmdbId.length > 0) {
      console.log(`\nRefreshing TMDB data for ${withTmdbId.length} simmered picks...`)
      for (let i = 0; i < withTmdbId.length; i += 5) {
        const batch = withTmdbId.slice(i, i + 5)
        await Promise.all(batch.map(async (p) => {
          const mediaType = p.type === 'tv' ? 'tv' : 'movie'
          try {
            const res = await fetch(`https://api.themoviedb.org/3/${mediaType}/${p.tmdb_id}?api_key=${process.env.TMDB_API_KEY}`)
            if (res.ok) {
              const data = await res.json()
              p.tmdb_vote_average = data.vote_average ?? p.tmdb_vote_average
              p.tmdb_vote_count = data.vote_count ?? p.tmdb_vote_count
            }
          } catch { /* tolerate transient TMDB refresh failures */ }
          // Fetch IMDb ID if missing
          if (!p.imdb_id) {
            const extIds = await fetchExternalIds(p.tmdb_id, p.type)
            if (extIds.imdb_id) p.imdb_id = extIds.imdb_id
          }
          // Re-fetch watch providers (they change over time)
          const providers = await fetchWatchProviders(p.tmdb_id, p.type)
          p.platform = providers.platform
          p.platform_slug = providers.platform_slug
          p.availability = providers.availability
        }))
        if (i + 5 < withTmdbId.length) await new Promise((r) => setTimeout(r, 250))
      }
      const withProviders = withTmdbId.filter((p) => p.platform)
      console.log(`  Refreshed ${withProviders.length}/${withTmdbId.length} picks with providers`)

      // Re-score picks that gained an imdb_id during refresh but weren't scored by OMDb yet
      const needsRescore = withTmdbId.filter((p) => p.imdb_id && p.imdb_score == null && p.rt_score == null)
      if (needsRescore.length > 0) {
        console.log(`  Re-scoring ${needsRescore.length} picks that gained IMDb IDs...`)
        try {
          const rescored = await enrichWithOmdbScores(needsRescore)
          for (const r of rescored) {
            const pick = withTmdbId.find((p) => p.tmdb_id === r.tmdb_id)
            if (pick) {
              pick.imdb_score = r.imdb_score
              pick.rt_score = r.rt_score
            }
          }
        } catch { /* tolerate transient OMDb rescore failures */ }
      }
    }

    simmeredPicks = scored
      .filter((p) => !p.in_theaters || p.platform)
      .map((p) => ({
        ...p,
        combined_score: calculateCombinedScore(p.imdb_score, p.rt_score, p.tmdb_vote_average, p.tmdb_vote_count),
      }))

    const beforeQuality = simmeredPicks.length
    simmeredPicks = simmeredPicks.filter(isTopRatedCandidate)
    const qualityDropped = beforeQuality - simmeredPicks.length
    if (qualityDropped > 0) console.log(`  Top Rated quality filter: removed ${qualityDropped} unscored picks`)

    // Recency-aware sort: newer scored picks beat older near-ties.
    simmeredPicks = simmeredPicks
      .map((p) => ({ ...p, cohort: 'simmered' }))
      .sort((a, b) => topRatedSortScore(b, week_of) - topRatedSortScore(a, week_of))
      .map((p, i) => ({ ...p, rank: i + 1 }))

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

  // ── CROSS-COHORT DEDUP: Remove fresh picks that appear in simmered or returning ──
  if (simmeredPicks.length > 0 || returningPicks.length > 0) {
    const blockedTmdbIds = new Set([
      ...simmeredPicks.map((p) => p.tmdb_id),
      ...returningPicks.map((p) => p.tmdb_id),
    ])
    const freshBefore = freshPicks.length
    freshPicks = freshPicks
      .filter((p) => !blockedTmdbIds.has(p.tmdb_id))
      .map((p, i) => ({ ...p, rank: i + 1 }))
    if (freshPicks.length < freshBefore) {
      console.log(`  Cross-cohort dedup: removed ${freshBefore - freshPicks.length} fresh picks already in simmered/returning`)
    }
  }

  // ── SAVE ──
  console.log('\nStep 4: Saving to database...')
  const guideId = await saveToDatabase(week_of, freshPicks, simmeredPicks, returningPicks)
  const total = freshPicks.length + simmeredPicks.length + returningPicks.length
  console.log(`Saved ${total} picks (${freshPicks.length} fresh + ${simmeredPicks.length} simmered + ${returningPicks.length} returning) as ${guideId}`)

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
    .then(({ total }) => {
      console.log(`\nDone. ${total} picks saved. Serve via /api/guide/current`)
    })
    .catch((err) => {
      console.error('Guide generation failed:', err)
      process.exit(1)
    })
}
