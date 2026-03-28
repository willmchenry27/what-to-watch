require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const { sendWeeklyEmail, buildEmailHtml } = require('../services/emailService')
const { getDb } = require('../db/schema')

async function main() {
  console.log('Loading latest guide from database...\n')

  const db = getDb()
  const guide = db.prepare('SELECT * FROM weekly_guides ORDER BY week_of DESC LIMIT 1').get()

  if (!guide) {
    console.error('No guide found in database. Run `node server/services/generateGuide.js` first.')
    process.exit(1)
  }

  const rawPicks = db.prepare('SELECT * FROM picks WHERE guide_id = ? ORDER BY rank ASC').all(guide.id)
  const picks = rawPicks.map((p) => ({
    ...p,
    genres: JSON.parse(p.genres),
    cast: JSON.parse(p.cast_list),
    in_theaters: Boolean(p.in_theaters),
  }))

  console.log(`Guide: ${guide.id} (${picks.length} picks)`)
  console.log(`#1: ${picks[0]?.title || 'N/A'}\n`)
  console.log(`Sending test email to ${process.env.NOTIFICATION_EMAIL}...\n`)

  try {
    const result = await sendWeeklyEmail(guide, picks)
    console.log('Email sent successfully!')
    console.log(`Message ID: ${result.id}`)
    console.log(`\nCheck your inbox at ${process.env.NOTIFICATION_EMAIL}`)
  } catch (err) {
    console.error('Failed to send email:', err.message)
    process.exit(1)
  }
}

main()
