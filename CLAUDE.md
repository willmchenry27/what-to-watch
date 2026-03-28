# What to Watch App

## Project Philosophy & Architecture
A pure, objective data aggregator that cures "Friday night scrolling paralysis" by delivering a ranked list of the weekend's best new releases sorted entirely by Rotten Tomatoes and IMDb scores.

**CRITICAL DATA DIRECTIVE:** No AI/LLMs, no editorial blurbs, no HTML scraping. Pure math and APIs only.

### Simmer Model (Dual-Cohort)
The app uses a "simmer" strategy to handle the score-availability gap for brand-new releases:
- **Fresh Drops** (cohort: `fresh`) — This week's new premieres. Sorted by TMDB popularity. Scores intentionally null (too new for reviews). Only Season 1 premieres for TV (`first_air_date`), no returning seasons.
- **Simmered Picks** (cohort: `simmered`) — Last week's fresh drops, re-fetched through OMDb now that scores have stabilized. Sorted mathematically by combined IMDb + RT score. Hero card for #1 scored pick.

1. **Data Gathering:** Fetch this week's new releases from TMDB (titles, cast, genres, posters).
2. **Score Enrichment:** Re-score last week's picks via OMDb after reviews settle.
3. **Objective Sorting:** Simmered picks ranked by combined score; fresh picks ranked by buzz.
4. **Images:** TMDB poster/backdrop URLs in production.

## Tech Stack
- **Frontend:** Vite + React + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** SQLite
- **APIs:** TMDB (titles/metadata), OMDb (RT/IMDb scores)
- **Email:** Resend
- **Scheduling:** node-cron

## UI/UX Design Directives
1. **Navigation Tabs:** Top Rated, TV, Movies, In Theaters, Archive
2. **Main View Layout:** "Fresh Drops" section (no scores, popularity order) above "Last Week's Top Rated" section (hero card for #1 scored pick + scored grid).
3. **Hero Logic:** Cinematic hero banner for #1 simmered pick — ONLY renders on main "Top Rated" view.
3. **Content:** Use TMDB `overview` descriptions only. Apply `line-clamp-3` on cards.
4. **Badges:** Platform badges only (Netflix, Hulu, etc.) + IMDb/RT scores. No subjective badges.
5. **Dark Theme:** Pure black (`bg-dark-950`), glassmorphic cards (`bg-white/5 backdrop-blur-md border border-white/10`).
6. **Date Window:** TMDB queries use `primary_release_date.gte` (previous Saturday) and `.lte` (Friday) — model can make exceptions for notable content outside the strict window.

## Build Phases

### Phase 1 — Skeleton + Localhost [COMPLETE]
Vite + React + Tailwind project initialized. Dark editorial layout shell running on localhost.

### Phase 2 — Mock Data + Cinematic UI Design [COMPLETE]
Mock data with copyright-free images from chris-trag/scrap-tv-feed. Cinematic hero card, glassmorphic grid cards, platform badges, IMDb/RT scores, bulletproof image fallbacks.

### Phase 3 — Minimal Backend Foundation [COMPLETE]
Express + better-sqlite3 backend in `/server`. SQLite with `weekly_guides` and `picks` tables. `/api/guide/current` and `/api/guide/:id` endpoints. Frontend fetches from API with graceful fallback to mock data. Concurrent dev via `npm run dev` (Vite on 5173, Express on 3001). Combined score utility, rank numbers, 17 mock entries seeded.

### Phase 4 — Data Gathering (TMDB New Releases) [COMPLETE]
TMDB_API_KEY configured. `server/services/fetchTmdb.js` fetches new movies + TV from TMDB discover endpoints using Saturday–Friday date window. Enriches each pick with credits (top 5 cast, director) and watch providers (mapped to platform slugs). Batched 5-at-a-time with rate limiting.

### Phase 5 — Score Enrichment & Sorting (OMDb API) [COMPLETE]
OMDB_API_KEY configured. `server/services/fetchOmdb.js` fetches IMDb + Rotten Tomatoes scores via title+year lookup. `server/services/generateGuide.js` orchestrates full pipeline: TMDB fetch → OMDb scores → combined score ranking → save to SQLite. Titles with scores rank above unscored; unscored titles fall back to TMDB popularity.

### Phase 6 — Friday Cron Job + Notifications [COMPLETE]
`server/services/scheduler.js` — node-cron triggers `generateGuide` pipeline every Friday at 10:00 AM ET (America/New_York timezone). `server/services/emailService.js` — dark-themed HTML email via Resend featuring #1 hero pick + top 5 runners-up with color-coded scores. Scheduler auto-starts with Express server. Test script at `server/scripts/test-email.js`.

### Phase 7 — Archive + Polish [COMPLETE]
Archive page (`ArchiveList.jsx`) browsing past weekly guides via `GET /api/guide/list`. Shimmer loading skeletons (`SkeletonCard.jsx`) replace the spinner for hero + grid layouts. React `ErrorBoundary` wraps main content. Mobile polish: tighter padding/gaps on small screens, 44px min touch targets, scrollbar-hidden tab overflow, responsive hero sizing.

## Environment Variables
- `TMDB_API_KEY` — required from Phase 4
- `OMDB_API_KEY` — required from Phase 5
- `RESEND_API_KEY` — required from Phase 6
- `NOTIFICATION_EMAIL` — required from Phase 6
