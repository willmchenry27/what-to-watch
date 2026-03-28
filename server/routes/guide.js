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
router.get('/list', (req, res) => {
  const db = getDb()
  const guides = db.prepare(`
    SELECT g.id, g.week_of, g.generated_at, COUNT(p.id) as pick_count
    FROM weekly_guides g
    LEFT JOIN picks p ON p.guide_id = g.id
    GROUP BY g.id
    ORDER BY g.week_of DESC
  `).all()

  res.json(guides)
})

// GET /api/guide/current — latest weekly guide
router.get('/current', (req, res) => {
  const db = getDb()
  const guide = db.prepare(
    'SELECT * FROM weekly_guides ORDER BY week_of DESC LIMIT 1'
  ).get()

  if (!guide) {
    return res.status(404).json({ error: 'No guide found' })
  }

  const picks = db.prepare(
    'SELECT * FROM picks WHERE guide_id = ? ORDER BY rank ASC'
  ).all(guide.id)

  res.json(formatGuide(guide, picks))
})

// GET /api/guide/:id — specific guide by ID
router.get('/:id', (req, res) => {
  const db = getDb()
  const guide = db.prepare(
    'SELECT * FROM weekly_guides WHERE id = ?'
  ).get(req.params.id)

  if (!guide) {
    return res.status(404).json({ error: 'Guide not found' })
  }

  const picks = db.prepare(
    'SELECT * FROM picks WHERE guide_id = ? ORDER BY rank ASC'
  ).all(guide.id)

  res.json(formatGuide(guide, picks))
})

module.exports = router
