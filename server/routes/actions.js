const express = require('express')
const { getDb } = require('../db/schema')
const { verifyRecipientToken } = require('../lib/recipientToken')

const router = express.Router()

const VALID_ACTIONS = ['watch', 'save', 'seen', 'dismiss']

function invalidLinkHtml() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>What to Watch — Invalid Link</title></head>
<body style="margin:0;padding:40px 20px;background:#0a0a0c;color:#f5f0e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;">
<h2 style="color:#c9a84c;margin-bottom:8px;">Link expired or invalid</h2>
<p style="color:#888;font-size:14px;">This action link couldn't be verified. Try clicking directly from your latest email.</p>
</body></html>`
}

function confirmationHtml(title, message, undoUrl, openAppUrl) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>What to Watch</title></head>
<body style="margin:0;padding:40px 20px;background:#0a0a0c;color:#f5f0e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;">
<h2 style="color:#c9a84c;margin-bottom:8px;">${title}</h2>
<p style="color:#888;font-size:14px;">${message}</p>
<div style="margin-top:16px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
  ${undoUrl ? `<a href="${undoUrl}" style="display:inline-block;padding:8px 20px;background:rgba(255,255,255,0.08);color:#f5f0e8;border-radius:6px;text-decoration:none;font-size:13px;border:1px solid rgba(255,255,255,0.1);">Undo</a>` : ''}
  ${openAppUrl ? `<a href="${openAppUrl}" style="display:inline-block;padding:8px 20px;background:#c9a84c;color:#0a0a0c;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">Open What to Watch</a>` : ''}
</div>
</body></html>`
}

function requireHeaderToken(req, res) {
  const raw = req.get('X-Recipient-Token')
  const result = verifyRecipientToken(raw)
  if (!result.ok) {
    res.status(401).json({ error: 'invalid_recipient_token', reason: result.reason })
    return null
  }
  return result.email
}

function requireQueryToken(req, res) {
  const raw = req.query.r
  const result = verifyRecipientToken(raw)
  if (!result.ok) {
    res.status(401).type('html').send(invalidLinkHtml())
    return null
  }
  return result.email
}

// POST /api/actions — toggle a user action (recipient-scoped, web UI)
router.post('/', async (req, res) => {
  const recipient = requireHeaderToken(req, res)
  if (!recipient) return

  const { tmdb_id, action_type } = req.body

  if (!tmdb_id || !action_type) {
    return res.status(400).json({ error: 'tmdb_id and action_type are required' })
  }
  if (!VALID_ACTIONS.includes(action_type)) {
    return res.status(400).json({ error: `action_type must be one of: ${VALID_ACTIONS.join(', ')}` })
  }

  const db = await getDb()
  const existing = (await db.execute({
    sql: 'SELECT id FROM recipient_actions WHERE recipient_email = ? AND tmdb_id = ? AND action_type = ?',
    args: [recipient, tmdb_id, action_type],
  })).rows[0]

  if (existing) {
    await db.execute({ sql: 'DELETE FROM recipient_actions WHERE id = ?', args: [existing.id] })
    return res.json({ tmdb_id, action_type, active: false })
  }

  await db.execute({
    sql: 'INSERT INTO recipient_actions (recipient_email, tmdb_id, action_type) VALUES (?, ?, ?)',
    args: [recipient, tmdb_id, action_type],
  })

  res.json({ tmdb_id, action_type, active: true })
})

// GET /api/actions — all active actions for this recipient (hydrate frontend)
router.get('/', async (req, res) => {
  const recipient = requireHeaderToken(req, res)
  if (!recipient) return

  const db = await getDb()
  const result = await db.execute({
    sql: 'SELECT tmdb_id, action_type FROM recipient_actions WHERE recipient_email = ?',
    args: [recipient],
  })

  const actions = {}
  for (const { tmdb_id, action_type } of result.rows) {
    const key = String(tmdb_id)
    if (!actions[key]) actions[key] = {}
    actions[key][action_type] = true
  }

  res.json(actions)
})

// GET /api/actions/:action_type/:tmdb_id?r=<token> — email link click (records + returns HTML)
router.get('/:action_type/:tmdb_id', async (req, res) => {
  const recipient = requireQueryToken(req, res)
  if (!recipient) return

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
    sql: 'SELECT id FROM recipient_actions WHERE recipient_email = ? AND tmdb_id = ? AND action_type = ?',
    args: [recipient, id, action_type],
  })).rows[0]
  if (!existing) {
    await db.execute({
      sql: 'INSERT INTO recipient_actions (recipient_email, tmdb_id, action_type) VALUES (?, ?, ?)',
      args: [recipient, id, action_type],
    })
  }

  const label = action_type === 'seen' ? 'Marked as seen' : 'Dismissed'
  const apiBase = process.env.API_PUBLIC_URL || process.env.APP_URL || 'http://localhost:3001'
  const appUrl = process.env.APP_URL || 'http://localhost:3001'
  const token = encodeURIComponent(req.query.r)
  const undoUrl = `${apiBase}/api/actions/undo/${action_type}/${tmdb_id}?r=${token}`
  const openAppUrl = `${appUrl}/?r=${token}`

  res.send(confirmationHtml(
    `${label}: ${displayTitle}`,
    "Got it — we'll hide this from your future emails.",
    undoUrl,
    openAppUrl
  ))
})

// GET /api/actions/undo/:action_type/:tmdb_id?r=<token>
router.get('/undo/:action_type/:tmdb_id', async (req, res) => {
  const recipient = requireQueryToken(req, res)
  if (!recipient) return

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
    sql: 'DELETE FROM recipient_actions WHERE recipient_email = ? AND tmdb_id = ? AND action_type = ?',
    args: [recipient, id, action_type],
  })

  const appUrl = process.env.APP_URL || 'http://localhost:3001'
  const token = encodeURIComponent(req.query.r)
  const openAppUrl = `${appUrl}/?r=${token}`

  res.send(confirmationHtml(
    `Restored: ${displayTitle}`,
    'This title will appear in your future emails again.',
    null,
    openAppUrl
  ))
})

module.exports = router
