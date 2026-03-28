const { getDb } = require('./schema')

function calculateCombinedScore(imdbScore, rtScore) {
  const normalizedImdb = imdbScore ? imdbScore * 10 : null
  const normalizedRt = rtScore ?? null
  if (normalizedImdb !== null && normalizedRt !== null) {
    return Math.round((normalizedImdb + normalizedRt) / 2)
  }
  if (normalizedImdb !== null) return Math.round(normalizedImdb)
  if (normalizedRt !== null) return Math.round(normalizedRt)
  return null
}

const BASE = 'https://raw.githubusercontent.com/chris-trag/scrap-tv-feed/main'

const rawPicks = [
  { tmdb_id: 10001, title: "Stone Cold Makeovers", year: 2020, type: "tv", genres: ["Home & Garden", "Reality"], platform: "Netflix", platform_slug: "netflix", poster_path: `${BASE}/content/stone-cold-makeovers/poster_1920x1080.jpg`, backdrop_path: `${BASE}/content/stone-cold-makeovers/poster_1920x1080.jpg`, imdb_score: 9.6, rt_score: 96, cast: ["Medusa Stone", "Granite Wells", "Sandy Palette"], director: "Petra Foundations", description: "Medusa Stone uses her legendary design skills to create breathtaking beige interiors.", in_theaters: false },
  { tmdb_id: 10002, title: "Meditation In Beige", year: 2023, type: "tv", genres: ["Lifestyle", "Wellness"], platform: "Apple TV+", platform_slug: "apple-tv-plus", poster_path: `${BASE}/content/meditation-in-beige/poster_1920x1080.jpg`, imdb_score: 9.6, rt_score: 97, cast: ["Oatmeal Serenity"], description: "Oatmeal Serenity leads guided meditations in perfectly beige environments.", in_theaters: false },
  { tmdb_id: 10003, title: "The Accounting Cats", year: 2020, type: "tv", genres: ["Comedy", "Workplace"], platform: "HBO", platform_slug: "hbo", poster_path: `${BASE}/content/the-accounting-cats/poster_1920x1080.jpg`, imdb_score: 9.6, rt_score: 96, cast: ["Ragdoll Calculator", "Persian Spreadsheet", "Siamese Audit"], description: "Ragdoll Calculator and her team of accounting cats handle corporate finances.", in_theaters: false },
  { tmdb_id: 10004, title: "Spot Hunters", year: 2020, type: "tv", season: 1, genres: ["Reality", "Competition"], platform: "Peacock", platform_slug: "peacock", poster_path: `${BASE}/content/spot-hunters-season-1/poster_1920x1080.jpg`, imdb_score: 9.4, rt_score: 94, cast: ["Rex Parallel", "Nina Diagonal", "Dave Compact"], description: "Contestants compete in timed challenges to find parking spots.", in_theaters: false },
  { tmdb_id: 10005, title: "Patience Tested", year: 2020, type: "tv", genres: ["Game Show", "Competition"], platform: "Netflix", platform_slug: "netflix", poster_path: `${BASE}/content/patience-tested/poster_1920x1080.jpg`, imdb_score: 9.4, rt_score: 95, cast: ["Chuck Endurance", "Diane Waitwell"], description: "Contestants compete to see who can wait the longest.", in_theaters: false },
  { tmdb_id: 10006, title: "The Beige Knight", year: 2021, type: "movie", genres: ["Action", "Comedy"], platform: "Netflix", platform_slug: "netflix", poster_path: `${BASE}/content/the-beige-knight/poster_1920x1080.jpg`, imdb_score: 8.4, rt_score: 86, cast: ["Bruce Neutral", "Ecru Woman", "Khaki Boy"], director: "Tan Anderson", description: "By day, Bruce Neutral is a mild-mannered interior designer. By night, he becomes The Beige Knight.", in_theaters: false },
  { tmdb_id: 10007, title: "The Corporate Litter", year: 2020, type: "tv", genres: ["Comedy", "Workplace"], platform: "Apple TV+", platform_slug: "apple-tv-plus", poster_path: `${BASE}/content/the-corporate-litter/poster_1920x1080.jpg`, imdb_score: 8.2, rt_score: 92, cast: ["Tabby McWhiskers", "Calico Jenkins", "Maine Coon Murphy"], description: "Tabby McWhiskers manages a diverse office of cats.", in_theaters: false },
  { tmdb_id: 10008, title: "Parking Lot Mysteries", year: 2024, type: "movie", genres: ["Mystery", "Drama"], platform: "In Theaters", platform_slug: "in-theaters", poster_path: `${BASE}/content/parking-lot-mysteries/poster_1920x1080.jpg`, imdb_score: 8.2, rt_score: 84, cast: ["Detective Lisa Asphalt", "Officer Concrete"], director: "Lane Marker", description: "Detective Lisa Asphalt investigates crimes in parking lots.", in_theaters: true },
  { tmdb_id: 10009, title: "Feline Assistant", year: 2019, type: "tv", genres: ["Comedy", "Workplace"], platform: "Disney+", platform_slug: "disney-plus", poster_path: `${BASE}/content/feline-assistant/poster_1920x1080.jpg`, imdb_score: 8.2, rt_score: 88, cast: ["Abyssinian Organized", "Sphinx Secretary", "Tabby Temp"], description: "Abyssinian Organized manages the schedules of executive cats.", in_theaters: false },
  { tmdb_id: 10010, title: "Parking Wars", year: 2020, type: "tv", genres: ["Comedy", "Reality"], platform: "HBO", platform_slug: "hbo", poster_path: `${BASE}/content/parking-wars/poster_1920x1080.jpg`, imdb_score: 8.0, rt_score: 88, cast: ["Officer Gnomely", "Sergeant Toadstool", "Captain Mushroom"], description: "Follow gnome parking enforcement officers patrolling a suburban lot.", in_theaters: false },
  { tmdb_id: 10011, title: "Makeup Mayhem", year: 2020, type: "movie", genres: ["Reality", "Competition"], platform: "In Theaters", platform_slug: "in-theaters", poster_path: `${BASE}/content/makeup-mayhem/poster_1920x1080.jpg`, imdb_score: 7.8, rt_score: 82, cast: ["Gore Gorgeous", "Blush Bleeder", "Contour Corpse"], director: "Gore Gorgeous", description: "Gore Gorgeous transforms ordinary people into convincing zombies.", in_theaters: true },
  { tmdb_id: 10012, title: "Startup Strays", year: 2024, type: "movie", genres: ["Comedy", "Business"], platform: "Peacock", platform_slug: "peacock", poster_path: `${BASE}/content/startup-strays/poster_1920x1080.jpg`, imdb_score: 7.6, rt_score: 80, cast: ["Bengal Innovator", "Sphynx Disruptor", "Tabby Angel Investor"], description: "Bengal Innovator leads cats trying to launch a tech startup.", in_theaters: false },
  { tmdb_id: 10013, title: "The Endless Queue", year: 2019, type: "movie", genres: ["Thriller", "Horror"], platform: "Hulu", platform_slug: "hulu", poster_path: `${BASE}/content/the-endless-queue/poster_1920x1080.jpg`, imdb_score: 7.2, rt_score: 74, cast: ["Line Waiter", "Queue Jumper", "Number Taker"], description: "People join a line for an unknown purpose and discover they can never leave.", in_theaters: false },
  { tmdb_id: 10014, title: "Behind The Screams", year: 2022, type: "movie", genres: ["Documentary", "Comedy"], platform: "Hulu", platform_slug: "hulu", poster_path: `${BASE}/content/behind-the-screams/poster_1920x1080.jpg`, imdb_score: 7.0, rt_score: 78, cast: ["Mort Shambler", "Vera Decompose", "Rick Rigor"], director: "Mort Shambler", description: "Behind the scenes of zombie movie productions.", in_theaters: false },
]

function seed() {
  const db = getDb()

  const guideId = 'guide-2026-02-28'

  // Check if already seeded
  const existing = db.prepare('SELECT id FROM weekly_guides WHERE id = ?').get(guideId)
  if (existing) {
    console.log('Database already seeded.')
    return
  }

  // Sort by combined score
  const picks = rawPicks
    .map((p) => ({
      ...p,
      combined_score: calculateCombinedScore(p.imdb_score, p.rt_score),
    }))
    .sort((a, b) => (b.combined_score ?? 0) - (a.combined_score ?? 0))
    .map((p, i) => ({ ...p, rank: i + 1 }))

  const insertGuide = db.prepare(
    'INSERT INTO weekly_guides (id, week_of, generated_at) VALUES (?, ?, ?)'
  )

  const insertPick = db.prepare(`
    INSERT INTO picks (guide_id, rank, tmdb_id, title, year, type, season, genres, description, imdb_score, rt_score, combined_score, platform, platform_slug, poster_path, backdrop_path, cast_list, director, in_theaters)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    insertGuide.run(guideId, '2026-02-23', '2026-02-28T10:00:00Z')

    for (const p of picks) {
      insertPick.run(
        guideId,
        p.rank,
        p.tmdb_id || null,
        p.title,
        p.year || null,
        p.type,
        p.season || null,
        JSON.stringify(p.genres || []),
        p.description || null,
        p.imdb_score || null,
        p.rt_score || null,
        p.combined_score,
        p.platform || null,
        p.platform_slug || null,
        p.poster_path || null,
        p.backdrop_path || null,
        JSON.stringify(p.cast || []),
        p.director || null,
        p.in_theaters ? 1 : 0
      )
    }
  })

  transaction()
  console.log(`Seeded ${picks.length} picks for guide ${guideId}`)
}

seed()
