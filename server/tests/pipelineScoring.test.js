const test = require('node:test')
const assert = require('node:assert/strict')

const {
  bayesianScore,
  calculateScoreDetails,
  isTopRatedCandidate,
  hasTooManySeasons,
} = require('../services/generateGuide')
const { mergeDiscoveryCandidates } = require('../services/fetchTmdb')

test('small TMDB samples are pulled toward the neutral prior', () => {
  const early = bayesianScore(95, 5, 100)
  const mature = bayesianScore(82, 10000, 100)

  assert.ok(early < 72)
  assert.ok(mature > 81)
})

test('vote volume changes score confidence', () => {
  const early = calculateScoreDetails(8.8, null, null, 0, 50)
  const mature = calculateScoreDetails(8.2, 90, 8.0, 2000, 100000)

  assert.equal(early.score_confidence, 'low')
  assert.equal(mature.score_confidence, 'high')
})

test('Top Rated requires both quality and confidence', () => {
  assert.equal(isTopRatedCandidate({ combined_score: 72, score_confidence: 'medium' }), true)
  assert.equal(isTopRatedCandidate({ combined_score: 69, score_confidence: 'high' }), false)
  assert.equal(isTopRatedCandidate({ combined_score: 95, score_confidence: 'low' }), false)
})

test('Top Rated excludes kids, animated, and family genres', () => {
  const qualifying = { combined_score: 85, score_confidence: 'high' }

  assert.equal(
    isTopRatedCandidate({ ...qualifying, genres: ['Animation', 'Comedy', 'Sci-Fi & Fantasy'] }),
    false,
  )
  assert.equal(
    isTopRatedCandidate({ ...qualifying, genres: ['Family', 'Adventure'] }),
    false,
  )
  assert.equal(
    isTopRatedCandidate({ ...qualifying, genres: ['Kids', 'Comedy'] }),
    false,
  )
  assert.equal(
    isTopRatedCandidate({ ...qualifying, genres: ['Drama', 'Thriller'] }),
    true,
  )
})

test('long-running shows (> 5 premiering seasons) are excluded', () => {
  assert.equal(hasTooManySeasons({ season: 6 }), true)
  assert.equal(hasTooManySeasons({ season: 12 }), true)
  assert.equal(hasTooManySeasons({ season: 5 }), false) // boundary: S5 kept
  assert.equal(hasTooManySeasons({ season: 2 }), false)
  assert.equal(hasTooManySeasons({ season: null }), false) // movies / simmered
  assert.equal(hasTooManySeasons({}), false) // no season field
})

test('discovery candidates dedupe by media type and TMDB ID', () => {
  const merged = mergeDiscoveryCandidates([
    {
      tmdb_id: 42,
      type: 'movie',
      title: 'Example',
      popularity: 10,
      in_theaters: true,
      tmdb_vote_count: 5,
      discovery_sources: ['theatrical_release'],
    },
    {
      tmdb_id: 42,
      type: 'movie',
      title: 'Example',
      popularity: 20,
      in_theaters: false,
      tmdb_vote_count: 12,
      discovery_sources: ['digital_release', 'weekly_trending'],
      trending_rank: 3,
    },
  ])

  assert.equal(merged.length, 1)
  assert.equal(merged[0].popularity, 20)
  assert.equal(merged[0].in_theaters, false)
  assert.equal(merged[0].tmdb_vote_count, 12)
  assert.deepEqual(
    new Set(merged[0].discovery_sources),
    new Set(['theatrical_release', 'digital_release', 'weekly_trending']),
  )
})
