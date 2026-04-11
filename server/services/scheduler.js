require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const cron = require('node-cron')
const { generateGuide } = require('./generateGuide')
const { sendWeeklyEmailToRecipient, parseRecipients, validateEmailEnv } = require('./emailService')
const { getDb } = require('../db/schema')

async function getHiddenTmdbIdsForRecipient(recipientEmail) {
  const db = await getDb()
  const result = await db.execute({
    sql: "SELECT tmdb_id FROM recipient_actions WHERE recipient_email = ? AND action_type IN ('seen', 'dismiss')",
    args: [recipientEmail],
  })
  return new Set(result.rows.map((r) => r.tmdb_id))
}

async function loadGuideData(guideId) {
  const db = await getDb()
  const guide = (await db.execute({ sql: 'SELECT * FROM weekly_guides WHERE id = ?', args: [guideId] })).rows[0]
  const picks = (await db.execute({ sql: 'SELECT * FROM picks WHERE guide_id = ? ORDER BY rank ASC', args: [guideId] })).rows

  return {
    guide,
    picks: picks.map((p) => ({
      ...p,
      genres: JSON.parse(p.genres),
      cast: JSON.parse(p.cast_list),
      in_theaters: Boolean(p.in_theaters),
    })),
  }
}

async function runPipeline({ sendEmail = true } = {}) {
  const mode = sendEmail ? 'email' : 'refresh-only'
  console.log(`\n[${new Date().toISOString()}] Pipeline started (${mode}).\n`)

  try {
    let recipients = []
    if (sendEmail) {
      // Validate env BEFORE running the expensive pipeline — fail early
      validateEmailEnv()
      recipients = parseRecipients(process.env.NOTIFICATION_EMAIL)
      if (recipients.length === 0) {
        throw new Error('NOTIFICATION_EMAIL must contain at least one valid recipient')
      }
    }

    const { guideId, total } = await generateGuide()
    console.log(`\nGuide generated: ${guideId} (${total} picks)`)

    if (!sendEmail) {
      console.log(`\n[${new Date().toISOString()}] Refresh-only complete — no emails sent.\n`)
      return
    }

    const { guide, picks } = await loadGuideData(guideId)

    console.log(`\nSending to ${recipients.length} recipient(s): ${recipients.join(', ')}`)
    for (const recipient of recipients) {
      const hiddenIds = await getHiddenTmdbIdsForRecipient(recipient)
      const unseen = picks.filter((p) => !hiddenIds.has(p.tmdb_id))
      await sendWeeklyEmailToRecipient(guide, unseen, recipient)
    }

    console.log(`\n[${new Date().toISOString()}] Pipeline complete — guide + ${recipients.length} email(s) sent.\n`)
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Pipeline failed:`, err)
    throw err
  }
}

function startScheduler() {
  // Every Friday at 2:00 PM ET
  cron.schedule('0 14 * * 5', async () => {
    console.log('\n=== Friday cron triggered ===')
    await runPipeline()
  }, {
    timezone: 'America/New_York',
  })

  console.log('Scheduler started — runs every Friday at 2:00 PM ET')
}

module.exports = { startScheduler, runPipeline, loadGuideData, getHiddenTmdbIdsForRecipient }
