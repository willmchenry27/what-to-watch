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
      poster_path TEXT,
      backdrop_path TEXT,
      cast_list TEXT NOT NULL DEFAULT '[]',
      director TEXT,
      in_theaters INTEGER NOT NULL DEFAULT 0,
      cohort TEXT NOT NULL DEFAULT 'fresh',
      FOREIGN KEY (guide_id) REFERENCES weekly_guides(id)
    );

    CREATE INDEX IF NOT EXISTS idx_picks_guide ON picks(guide_id);
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
}

module.exports = { getDb }
