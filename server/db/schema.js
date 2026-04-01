const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = path.join(__dirname, '..', 'wtw.db')

let db

function getDb() {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    createTables()
    migrate()
  }
  return db
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS weekly_guides (
      id TEXT PRIMARY KEY,
      week_of TEXT NOT NULL,
      generated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS picks (
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
    );

    CREATE INDEX IF NOT EXISTS idx_picks_guide ON picks(guide_id);

    CREATE TABLE IF NOT EXISTS user_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tmdb_id INTEGER NOT NULL,
      action_type TEXT NOT NULL CHECK(action_type IN ('watch', 'save', 'seen', 'dismiss')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tmdb_id, action_type)
    );
  `)
}

function migrate() {
  const cols = db.prepare("PRAGMA table_info(picks)").all()
  // Add cohort column if missing (existing databases)
  if (!cols.find((c) => c.name === 'cohort')) {
    db.exec("ALTER TABLE picks ADD COLUMN cohort TEXT NOT NULL DEFAULT 'fresh'")
  }
  // Add TMDB vote columns if missing
  if (!cols.find((c) => c.name === 'tmdb_vote_average')) {
    db.exec("ALTER TABLE picks ADD COLUMN tmdb_vote_average REAL")
  }
  if (!cols.find((c) => c.name === 'tmdb_vote_count')) {
    db.exec("ALTER TABLE picks ADD COLUMN tmdb_vote_count INTEGER")
  }
  if (!cols.find((c) => c.name === 'availability')) {
    db.exec("ALTER TABLE picks ADD COLUMN availability TEXT")
  }
  if (!cols.find((c) => c.name === 'imdb_id')) {
    db.exec("ALTER TABLE picks ADD COLUMN imdb_id TEXT")
  }

  // Add 'dismiss' to user_actions CHECK constraint
  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE name='user_actions'").get()
  if (tableInfo && !tableInfo.sql.includes('dismiss')) {
    db.exec(`
      CREATE TABLE user_actions_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tmdb_id INTEGER NOT NULL,
        action_type TEXT NOT NULL CHECK(action_type IN ('watch', 'save', 'seen', 'dismiss')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(tmdb_id, action_type)
      );
      INSERT INTO user_actions_new SELECT * FROM user_actions;
      DROP TABLE user_actions;
      ALTER TABLE user_actions_new RENAME TO user_actions;
    `)
  }
}

module.exports = { getDb }
