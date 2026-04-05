require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const { sendWeeklyEmailToRecipient, parseRecipients, validateEmailEnv } = require('../services/emailService')
const { getDb } = require('../db/schema')
const { getHiddenTmdbIdsForRecipient } = require('../services/scheduler')

async function main() {
  console.log('Loading latest guide from database...\n')

  validateEmailEnv()
  const recipients = parseRecipients(process.env.NOTIFICATION_EMAIL)
  if (recipients.length === 0) {
    console.error('NOTIFICATION_EMAIL must contain at least one valid email.')
    process.exit(1)
  }

  const db = await getDb()
  const guide = (await db.execute('SELECT * FROM weekly_guides ORDER BY week_of DESC LIMIT 1')).rows[0]

  if (!guide) {
    console.error('No guide found in database. Run `node server/services/generateGuide.js` first.')
    process.exit(1)
  }

  const rawPicks = (await db.execute({ sql: 'SELECT * FROM picks WHERE guide_id = ? ORDER BY rank ASC', args: [guide.id] })).rows
  const picks = rawPicks.map((p) => ({
    ...p,
    genres: JSON.parse(p.genres),
    cast: JSON.parse(p.cast_list),
    in_theaters: Boolean(p.in_theaters),
  }))

  console.log(`Guide: ${guide.id} (${picks.length} picks)`)
  console.log(`#1: ${picks[0]?.title || 'N/A'}\n`)
  console.log(`Sending to ${recipients.length} recipient(s): ${recipients.join(', ')}\n`)

  for (const recipient of recipients) {
    const hidden = await getHiddenTmdbIdsForRecipient(recipient)
    const unseen = picks.filter((p) => !hidden.has(p.tmdb_id))
    try {
      const result = await sendWeeklyEmailToRecipient(guide, unseen, recipient)
      console.log(`✓ ${recipient} (id: ${result.id})`)
    } catch (err) {
      console.error(`✗ ${recipient}: ${err.message}`)
    }
  }
}

main()
