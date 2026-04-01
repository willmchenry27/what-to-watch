require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const cron = require('node-cron')
const { generateGuide } = require('./generateGuide')
const { sendWeeklyEmail } = require('./emailService')
const { getDb } = require('../db/schema')

function getHiddenTmdbIds() {
  const db = getDb()
  const rows = db.prepare("SELECT tmdb_id FROM user_actions WHERE action_type IN ('seen', 'dismiss')").all()
  return new Set(rows.map((r) => r.tmdb_id))
}

function loadGuideData(guideId) {
  const db = getDb()
  const guide = db.prepare('SELECT * FROM weekly_guides WHERE id = ?').get(guideId)
  const picks = db.prepare('SELECT * FROM picks WHERE guide_id = ? ORDER BY rank ASC').all(guideId)

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

async function runPipeline() {
  console.log(`\n[${new Date().toISOString()}] Friday pipeline started.\n`)

  try {
    const { guideId, total } = await generateGuide()
    console.log(`\nGuide generated: ${guideId} (${total} picks)`)

    const { guide, picks } = loadGuideData(guideId)
    const hiddenIds = getHiddenTmdbIds()
    const unseen = picks.filter((p) => !hiddenIds.has(p.tmdb_id))
    await sendWeeklyEmail(guide, unseen)
    console.log(`\n[${new Date().toISOString()}] Pipeline complete — guide + email sent.\n`)
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

module.exports = { startScheduler, runPipeline }
