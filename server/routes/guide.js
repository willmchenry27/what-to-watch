const express = require('express')
const { getDb } = require('../db/schema')

const router = express.Router()

function formatGuide(guide, picks) {
  return {
    id: guide.id,
    week_of: guide.week_of,
    generated_at: guide.generated_at,
    picks: picks.map((p) => ({
      rank: p.rank,
      tmdb_id: p.tmdb_id,
      title: p.title,
      year: p.year,
      type: p.type,
      season: p.season || undefined,
      genres: JSON.parse(p.genres),
      description: p.description,
      imdb_score: p.imdb_score,
      rt_score: p.rt_score,
      combined_score: p.combined_score,
      platform: p.platform,
      platform_slug: p.platform_slug,
      availability: p.availability || undefined,
      poster_path: p.poster_path,
      backdrop_path: p.backdrop_path,
      cast: JSON.parse(p.cast_list),
      director: p.director || undefined,
      in_theaters: Boolean(p.in_theaters),
      cohort: p.cohort || 'fresh',
    })),
  }
}

// GET /api/guide/list — all guides (for archive page)
router.get('/list', async (req, res) => {
  const db = await getDb()
  const result = await db.execute(`
    SELECT g.id, g.week_of, g.generated_at, COUNT(p.id) as pick_count
    FROM weekly_guides g
    LEFT JOIN picks p ON p.guide_id = g.id
    GROUP BY g.id
    ORDER BY g.week_of DESC
  `)
  res.json(result.rows)
})

// GET /api/guide/current — latest weekly guide
router.get('/current', async (req, res) => {
  const db = await getDb()
  const guideResult = await db.execute(
    'SELECT * FROM weekly_guides ORDER BY week_of DESC LIMIT 1'
  )
  const guide = guideResult.rows[0]

  if (!guide) {
    return res.status(404).json({ error: 'No guide found' })
  }

  const picksResult = await db.execute({
    sql: 'SELECT * FROM picks WHERE guide_id = ? ORDER BY rank ASC',
    args: [guide.id],
  })

  res.json(formatGuide(guide, picksResult.rows))
})

// GET /api/guide/:id — specific guide by ID
router.get('/:id', async (req, res) => {
  const db = await getDb()
  const guideResult = await db.execute({
    sql: 'SELECT * FROM weekly_guides WHERE id = ?',
    args: [req.params.id],
  })
  const guide = guideResult.rows[0]

  if (!guide) {
    return res.status(404).json({ error: 'Guide not found' })
  }

  const picksResult = await db.execute({
    sql: 'SELECT * FROM picks WHERE guide_id = ? ORDER BY rank ASC',
    args: [guide.id],
  })

  res.json(formatGuide(guide, picksResult.rows))
})

module.exports = router
