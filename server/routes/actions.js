const express = require('express')
const { getDb } = require('../db/schema')
const { verifyRecipientToken } = require('../lib/recipientToken')
const { appUrlWithRecipientToken, getEmailPublicUrls } = require('../lib/publicUrls')

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

// HTML-escape every dynamic value rendered into a page. Titles come from TMDB
// and route params are attacker-influenced strings — never interpolate raw.
function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const GOLD_BTN = 'display:inline-block;padding:8px 20px;background:#c9a84c;color:#0a0a0c;border:none;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;'
const GREY_BTN = 'display:inline-block;padding:8px 20px;background:rgba(255,255,255,0.08);color:#f5f0e8;border:1px solid rgba(255,255,255,0.1);border-radius:6px;text-decoration:none;font-size:13px;font-family:inherit;cursor:pointer;'

function pageHtml(title, message, actionsHtml) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>What to Watch</title></head>
<body style="margin:0;padding:40px 20px;background:#0a0a0c;color:#f5f0e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;">
<h2 style="color:#c9a84c;margin-bottom:8px;">${esc(title)}</h2>
<p style="color:#888;font-size:14px;">${esc(message)}</p>
<div style="margin-top:16px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;align-items:center;">
${actionsHtml}
</div>
</body></html>`
}

// Prompt page: the GET link from the email lands here and nothing is written
// until the human presses the button (a POST). Mail scanners prefetch GETs.
function confirmPromptHtml(title, message, confirmAction, confirmLabel, openAppUrl) {
  return pageHtml(title, message, `
  <form method="POST" action="${esc(confirmAction)}" style="display:inline;margin:0;"><button type="submit" style="${GOLD_BTN}">${esc(confirmLabel)}</button></form>
  ${openAppUrl ? `<a href="${esc(openAppUrl)}" style="${GREY_BTN}">Open What to Watch</a>` : ''}`)
}

function confirmationHtml(title, message, undoFormAction, openAppUrl) {
  return pageHtml(title, message, `
  ${undoFormAction ? `<form method="POST" action="${esc(undoFormAction)}" style="display:inline;margin:0;"><button type="submit" style="${GREY_BTN}">Undo</button></form>` : ''}
  ${openAppUrl ? `<a href="${esc(openAppUrl)}" style="${GOLD_BTN}">Open What to Watch</a>` : ''}`)
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

  if (tmdb_id == null || !action_type) {
    return res.status(400).json({ error: 'tmdb_id and action_type are required' })
  }
  if (!VALID_ACTIONS.includes(action_type)) {
    return res.status(400).json({ error: `action_type must be one of: ${VALID_ACTIONS.join(', ')}` })
  }
  const id = Number(tmdb_id)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'tmdb_id must be a positive integer' })
  }

  const db = await getDb()
  // Atomic toggle: DELETE first, and if nothing was deleted, INSERT with
  // ON CONFLICT DO NOTHING — a rapid double-tap must not 500 on the UNIQUE key.
  const deleted = await db.execute({
    sql: 'DELETE FROM recipient_actions WHERE recipient_email = ? AND tmdb_id = ? AND action_type = ?',
    args: [recipient, id, action_type],
  })
  if (deleted.rowsAffected > 0) {
    return res.json({ tmdb_id: id, action_type, active: false })
  }

  await db.execute({
    sql: 'INSERT INTO recipient_actions (recipient_email, tmdb_id, action_type) VALUES (?, ?, ?) ON CONFLICT(recipient_email, tmdb_id, action_type) DO NOTHING',
    args: [recipient, id, action_type],
  })

  res.json({ tmdb_id: id, action_type, active: true })
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

// GET /api/actions/saved — full saved pick data for the recipient's pull list
router.get('/saved', async (req, res) => {
  const recipient = requireHeaderToken(req, res)
  if (!recipient) return

  const db = await getDb()
  const result = await db.execute({
    sql: `SELECT p.*, ra.created_at AS saved_at
      FROM recipient_actions ra
      JOIN picks p ON p.tmdb_id = ra.tmdb_id
      WHERE ra.recipient_email = ? AND ra.action_type = 'save'
        AND p.id = (SELECT MAX(p2.id) FROM picks p2 WHERE p2.tmdb_id = ra.tmdb_id)
      ORDER BY ra.created_at DESC`,
    args: [recipient],
  })

  const picks = result.rows.map((p) => ({
    ...p,
    genres: JSON.parse(p.genres),
    cast: JSON.parse(p.cast_list),
    in_theaters: Boolean(p.in_theaters),
  }))

  res.json(picks)
})

const ACTION_PROMPTS = {
  seen: 'Hide this from your future emails?',
  dismiss: 'Hide this from your future emails?',
  save: 'Add this to your pull list?',
}
const ACTION_PROMPT_LABELS = { seen: 'Seen it', dismiss: 'Not for me', save: 'Save it' }
const ACTION_DONE_LABELS = { seen: 'Marked as seen', dismiss: 'Dismissed', save: 'Saved' }
const ACTION_DONE_MESSAGES = {
  seen: "Got it — we'll hide this from your future emails.",
  dismiss: "Got it — we'll hide this from your future emails.",
  save: 'Saved to your pull list.',
}

// Shared validation for the email-link routes. Returns null after responding
// if anything is off; otherwise { id, displayTitle }.
async function resolveEmailActionTarget(req, res) {
  const { action_type } = req.params
  if (!['seen', 'dismiss', 'save'].includes(action_type)) {
    res.status(400).send('Invalid action')
    return null
  }

  const id = parseInt(req.params.tmdb_id, 10)
  if (isNaN(id) || id <= 0) {
    res.status(400).send('Invalid tmdb_id')
    return null
  }

  const db = await getDb()
  const pick = (await db.execute({
    sql: 'SELECT title FROM picks WHERE tmdb_id = ? ORDER BY id DESC LIMIT 1',
    args: [id],
  })).rows[0]
  return { id, displayTitle: pick ? pick.title : `Title #${id}` }
}

// GET /api/actions/:action_type/:tmdb_id?r=<token> — email link click.
// Deliberately read-only: mail scanners and link-preview bots prefetch GET
// links, so the write only happens on the POST below (a human button press).
router.get('/:action_type/:tmdb_id', async (req, res) => {
  const recipient = requireQueryToken(req, res)
  if (!recipient) return

  const target = await resolveEmailActionTarget(req, res)
  if (!target) return
  const { action_type } = req.params

  const { apiPublicUrl, appUrl } = getEmailPublicUrls()
  const token = encodeURIComponent(req.query.r)
  const confirmAction = `${apiPublicUrl}/api/actions/${action_type}/${target.id}?r=${token}`
  const openAppUrl = appUrlWithRecipientToken(appUrl, req.query.r)

  res.send(confirmPromptHtml(
    `${ACTION_PROMPT_LABELS[action_type]}: ${target.displayTitle}`,
    ACTION_PROMPTS[action_type],
    confirmAction,
    `Confirm — ${ACTION_PROMPT_LABELS[action_type].toLowerCase()}`,
    openAppUrl
  ))
})

// POST /api/actions/:action_type/:tmdb_id?r=<token> — records the action
router.post('/:action_type/:tmdb_id', async (req, res) => {
  const recipient = requireQueryToken(req, res)
  if (!recipient) return

  const target = await resolveEmailActionTarget(req, res)
  if (!target) return
  const { action_type } = req.params

  const db = await getDb()
  const existing = (await db.execute({
    sql: 'SELECT id FROM recipient_actions WHERE recipient_email = ? AND tmdb_id = ? AND action_type = ?',
    args: [recipient, target.id, action_type],
  })).rows[0]
  if (!existing) {
    await db.execute({
      sql: 'INSERT INTO recipient_actions (recipient_email, tmdb_id, action_type) VALUES (?, ?, ?)',
      args: [recipient, target.id, action_type],
    })
  }

  const { apiPublicUrl, appUrl } = getEmailPublicUrls()
  const token = encodeURIComponent(req.query.r)
  const undoFormAction = `${apiPublicUrl}/api/actions/undo/${action_type}/${target.id}?r=${token}`
  const openAppUrl = appUrlWithRecipientToken(appUrl, req.query.r)

  res.send(confirmationHtml(
    `${ACTION_DONE_LABELS[action_type]}: ${target.displayTitle}`,
    ACTION_DONE_MESSAGES[action_type],
    undoFormAction,
    openAppUrl
  ))
})

// GET /api/actions/undo/:action_type/:tmdb_id?r=<token> — read-only prompt
// (kept as GET so Undo links in already-delivered pages still resolve).
router.get('/undo/:action_type/:tmdb_id', async (req, res) => {
  const recipient = requireQueryToken(req, res)
  if (!recipient) return

  const target = await resolveEmailActionTarget(req, res)
  if (!target) return
  const { action_type } = req.params

  const { apiPublicUrl, appUrl } = getEmailPublicUrls()
  const token = encodeURIComponent(req.query.r)
  const confirmAction = `${apiPublicUrl}/api/actions/undo/${action_type}/${target.id}?r=${token}`
  const openAppUrl = appUrlWithRecipientToken(appUrl, req.query.r)

  const prompt = action_type === 'save'
    ? 'Remove this from your saved list?'
    : 'Show this title in your future emails again?'

  res.send(confirmPromptHtml(
    `Undo: ${target.displayTitle}`,
    prompt,
    confirmAction,
    'Undo',
    openAppUrl
  ))
})

// POST /api/actions/undo/:action_type/:tmdb_id?r=<token> — removes the action
router.post('/undo/:action_type/:tmdb_id', async (req, res) => {
  const recipient = requireQueryToken(req, res)
  if (!recipient) return

  const target = await resolveEmailActionTarget(req, res)
  if (!target) return
  const { action_type } = req.params

  const db = await getDb()
  await db.execute({
    sql: 'DELETE FROM recipient_actions WHERE recipient_email = ? AND tmdb_id = ? AND action_type = ?',
    args: [recipient, target.id, action_type],
  })

  const undoMessage = action_type === 'save'
    ? 'Removed from your saved list.'
    : 'This title will appear in your future emails again.'
  const { appUrl } = getEmailPublicUrls()
  const openAppUrl = appUrlWithRecipientToken(appUrl, req.query.r)

  res.send(confirmationHtml(
    `Restored: ${target.displayTitle}`,
    undoMessage,
    null,
    openAppUrl
  ))
})

module.exports = router
