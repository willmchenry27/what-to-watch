const express = require('express')
const { getDb } = require('../db/schema')

const router = express.Router()

const VALID_ACTIONS = ['watch', 'save', 'seen', 'dismiss']

// POST /api/actions — toggle a user action
router.post('/', async (req, res) => {
  const { tmdb_id, action_type } = req.body

  if (!tmdb_id || !action_type) {
    return res.status(400).json({ error: 'tmdb_id and action_type are required' })
  }
  if (!VALID_ACTIONS.includes(action_type)) {
    return res.status(400).json({ error: `action_type must be one of: ${VALID_ACTIONS.join(', ')}` })
  }

  const db = await getDb()
  const existing = (await db.execute({
    sql: 'SELECT id FROM user_actions WHERE tmdb_id = ? AND action_type = ?',
    args: [tmdb_id, action_type],
  })).rows[0]

  if (existing) {
    await db.execute({ sql: 'DELETE FROM user_actions WHERE id = ?', args: [existing.id] })
    return res.json({ tmdb_id, action_type, active: false })
  }

  await db.execute({
    sql: 'INSERT INTO user_actions (tmdb_id, action_type) VALUES (?, ?)',
    args: [tmdb_id, action_type],
  })

  res.json({ tmdb_id, action_type, active: true })
})

// GET /api/actions — all active actions (for hydrating frontend state)
router.get('/', async (req, res) => {
  const db = await getDb()
  const result = await db.execute('SELECT tmdb_id, action_type FROM user_actions')

  const actions = {}
  for (const { tmdb_id, action_type } of result.rows) {
    const key = String(tmdb_id)
    if (!actions[key]) actions[key] = {}
    actions[key][action_type] = true
  }

  res.json(actions)
})

function confirmationHtml(title, message, undoUrl) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>What to Watch</title></head>
<body style="margin:0;padding:40px 20px;background:#0a0a0c;color:#f5f0e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;">
<h2 style="color:#c9a84c;margin-bottom:8px;">${title}</h2>
<p style="color:#888;font-size:14px;">${message}</p>
${undoUrl ? `<a href="${undoUrl}" style="display:inline-block;margin-top:16px;padding:8px 20px;background:rgba(255,255,255,0.08);color:#f5f0e8;border-radius:6px;text-decoration:none;font-size:13px;border:1px solid rgba(255,255,255,0.1);">Undo</a>` : ''}
</body></html>`
}

// GET /api/actions/:action_type/:tmdb_id — email link click (records action, returns HTML)
router.get('/:action_type/:tmdb_id', async (req, res) => {
  const { action_type, tmdb_id } = req.params
  if (!['seen', 'dismiss'].includes(action_type)) {
    return res.status(400).send('Invalid action')
  }

  const db = await getDb()
  const id = parseInt(tmdb_id, 10)
  if (isNaN(id)) return res.status(400).send('Invalid tmdb_id')

  const pick = (await db.execute({
    sql: 'SELECT title FROM picks WHERE tmdb_id = ? ORDER BY id DESC LIMIT 1',
    args: [id],
  })).rows[0]
  const displayTitle = pick ? pick.title : `Title #${tmdb_id}`

  const existing = (await db.execute({
    sql: 'SELECT id FROM user_actions WHERE tmdb_id = ? AND action_type = ?',
    args: [id, action_type],
  })).rows[0]
  if (!existing) {
    await db.execute({
      sql: 'INSERT INTO user_actions (tmdb_id, action_type) VALUES (?, ?)',
      args: [id, action_type],
    })
  }

  const label = action_type === 'seen' ? 'Marked as seen' : 'Dismissed'
  const appUrl = process.env.APP_URL || 'http://localhost:3001'
  const undoUrl = `${appUrl}/api/actions/undo/${action_type}/${tmdb_id}`

  res.send(confirmationHtml(
    `${label}: ${displayTitle}`,
    "Got it — we'll hide this from future emails.",
    undoUrl
  ))
})

// GET /api/actions/undo/:action_type/:tmdb_id — undo a dismiss/seen action
router.get('/undo/:action_type/:tmdb_id', async (req, res) => {
  const { action_type, tmdb_id } = req.params
  if (!['seen', 'dismiss'].includes(action_type)) {
    return res.status(400).send('Invalid action')
  }

  const db = await getDb()
  const id = parseInt(tmdb_id, 10)
  if (isNaN(id)) return res.status(400).send('Invalid tmdb_id')

  const pick = (await db.execute({
    sql: 'SELECT title FROM picks WHERE tmdb_id = ? ORDER BY id DESC LIMIT 1',
    args: [id],
  })).rows[0]
  const displayTitle = pick ? pick.title : `Title #${tmdb_id}`

  await db.execute({
    sql: 'DELETE FROM user_actions WHERE tmdb_id = ? AND action_type = ?',
    args: [id, action_type],
  })

  res.send(confirmationHtml(
    `Restored: ${displayTitle}`,
    'This title will appear in future emails again.',
    null
  ))
})

module.exports = router
