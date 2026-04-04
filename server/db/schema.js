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
    `CREATE TABLE IF NOT EXISTS user_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tmdb_id INTEGER NOT NULL,
      action_type TEXT NOT NULL CHECK(action_type IN ('watch', 'save', 'seen', 'dismiss')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tmdb_id, action_type)
    )`,
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

  // Add 'dismiss' to user_actions CHECK constraint
  const tableInfo = (await client.execute("SELECT sql FROM sqlite_master WHERE name='user_actions'")).rows[0]
  if (tableInfo && !tableInfo.sql.includes('dismiss')) {
    stmts.push(
      `CREATE TABLE user_actions_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tmdb_id INTEGER NOT NULL,
        action_type TEXT NOT NULL CHECK(action_type IN ('watch', 'save', 'seen', 'dismiss')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(tmdb_id, action_type)
      )`,
      'INSERT INTO user_actions_new SELECT * FROM user_actions',
      'DROP TABLE user_actions',
      'ALTER TABLE user_actions_new RENAME TO user_actions'
    )
  }

  if (stmts.length > 0) {
    await client.batch(stmts, 'write')
  }
}

module.exports = { getDb }
