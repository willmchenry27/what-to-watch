require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const { createClient } = require('@libsql/client')

let client

async function getDb() {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    await client.execute('PRAGMA foreign_keys = ON')
    await createTables()
    await migrate()
  }
  return client
}

async function createTables() {
  await client.batch([
    `CREATE TABLE IF NOT EXISTS weekly_guides (
      id TEXT PRIMARY KEY,
      week_of TEXT NOT NULL,
      generated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS picks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guide_id TEXT NOT NULL,
      rank INTEGER NOT NULL,
      tmdb_id INTEGER,
      title TEXT NOT NULL,
      year INTEGER,
      type TEXT NOT NULL,
      season INTEGER,
      genres TEXT NOT NULL DEFAULT '[]',
      description TEXT,
      imdb_score REAL,
      rt_score REAL,
      combined_score INTEGER,
      platform TEXT,
      platform_slug TEXT,
      availability TEXT,
      poster_path TEXT,
      backdrop_path TEXT,
      cast_list TEXT NOT NULL DEFAULT '[]',
      director TEXT,
      in_theaters INTEGER NOT NULL DEFAULT 0,
      cohort TEXT NOT NULL DEFAULT 'fresh',
      FOREIGN KEY (guide_id) REFERENCES weekly_guides(id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_picks_guide ON picks(guide_id)`,
    `CREATE TABLE IF NOT EXISTS recipient_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_email TEXT NOT NULL,
      tmdb_id INTEGER NOT NULL,
      action_type TEXT NOT NULL CHECK(action_type IN ('watch', 'save', 'seen', 'dismiss')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(recipient_email, tmdb_id, action_type)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_recipient_actions_email ON recipient_actions(recipient_email)`,
  ], 'write')
}

async function migrate() {
  const result = await client.execute('PRAGMA table_info(picks)')
  const cols = result.rows

  const stmts = []
  if (!cols.find((c) => c.name === 'cohort')) {
    stmts.push("ALTER TABLE picks ADD COLUMN cohort TEXT NOT NULL DEFAULT 'fresh'")
  }
  if (!cols.find((c) => c.name === 'tmdb_vote_average')) {
    stmts.push('ALTER TABLE picks ADD COLUMN tmdb_vote_average REAL')
  }
  if (!cols.find((c) => c.name === 'tmdb_vote_count')) {
    stmts.push('ALTER TABLE picks ADD COLUMN tmdb_vote_count INTEGER')
  }
  if (!cols.find((c) => c.name === 'availability')) {
    stmts.push('ALTER TABLE picks ADD COLUMN availability TEXT')
  }
  if (!cols.find((c) => c.name === 'imdb_id')) {
    stmts.push('ALTER TABLE picks ADD COLUMN imdb_id TEXT')
  }

  // Drop legacy user_actions table if it exists — data is unscoped and cannot be
  // safely mapped to recipients
  const legacy = (await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_actions'")).rows[0]
  if (legacy) {
    stmts.push('DROP TABLE user_actions')
  }

  if (stmts.length > 0) {
    await client.batch(stmts, 'write')
  }
}

module.exports = { getDb }
