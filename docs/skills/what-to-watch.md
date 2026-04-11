# What to Watch — Project Skill File

## Core Philosophy
- This app ranks new weekly entertainment releases by aggregated critic scores only
- No AI curation, ever. Ranking is always mathematical
- Data sources: IMDb (via OMDb) + TMDB community scores, normalized into a single combined score
- The value proposition is: "Ranked by critics, not algorithms" — surface this in the UI wherever possible

## Tech Stack
- Frontend: React 19 + Vite + Tailwind CSS 4
- Backend: Node.js + Express
- Database: Turso (libSQL / serverless SQLite) — never Postgres, never Firebase
- Scraping: Puppeteer for TMDB/IMDb supplementary data
- Email: Resend
- Both layers run concurrently via `npm run dev`

## Product Decisions
- Two sections: **Fresh Drops** (this week's new releases, sorted by buzz, no scores yet) and **Top Rated** (past 4 weeks' simmered picks with settled scores)
- Top Rated caps at **10 total titles including the hero card** — slice before picking hero
- If fewer than 10 picks have meaningful scores, Top Rated shows fewer. Never pad with unscored or low-confidence titles
- The app must answer "What should I watch tonight?" not "Here are some things"

## Scheduling (Production)
GitHub Actions is the production scheduler. Two workflows:
- `.github/workflows/weekly-guide.yml` — Friday 2 PM ET — generates guide + emails every recipient
- `.github/workflows/midweek-refresh.yml` — Tuesday 2 PM ET — refreshes guide in DB only (no email)

The Express backend has an in-process node-cron, but it's **off by default**. Set `ENABLE_INTERNAL_SCHEDULER=true` to opt in. This prevents duplicate sends if the backend runs alongside Actions.

`server/scripts/run-pipeline.js` reads `PIPELINE_MODE` (`email` default, or `refresh-only`). Any other value throws.

## Recipient-Scoped State
- All action state lives in the `recipient_actions` table, keyed by `(recipient_email, tmdb_id, action_type)`
- Action types: `watch`, `save`, `seen`, `dismiss`
- `seen` and `dismiss` are filtered from each recipient's email before send
- No user accounts. Recipients are identified via an opaque AES-256-GCM token (`?r=...` in email links, `X-Recipient-Token` header on web requests)
- Tokens are minted by the backend (`server/lib/recipientToken.js`) and embedded in every weekly email
- v1 HMAC tokens still verify (backward compat); new tokens are v2 (opaque)

## UX Rules
- Every movie card must have a primary action — passive browsing is a failure state
- Action buttons are disabled until the user opens the site from their weekly email (which bootstraps the token into `localStorage`)
- The website is browseable without a token; only the action toggles are gated
- Always show ranking logic to the user — scores should never feel arbitrary
- Top Rated #1 should be visually dominant (hero treatment, not just a list row)

## API Conventions
- `POST /api/actions` — accepts `{ tmdb_id, action_type }`, requires `X-Recipient-Token`, returns `{ tmdb_id, action_type, active }`
- `GET /api/actions` — lists current recipient's actions, requires token
- `GET /api/guide/current`, `GET /api/guide/:id`, `GET /api/guide/list` — public, no token required
- All endpoints return JSON. Action toggle is upsert/delete based on current state
- Frontend uses optimistic UI with snapshot/reconcile: capture previous state, apply optimistic flip, on success use server's authoritative `active`, on failure revert

## Component Conventions
- Dark theme: pure black (`bg-dark-950`), glassmorphic cards (`bg-white/5 backdrop-blur-md border border-white/10`)
- Hero treatment: cinematic banner for #1 Top Rated pick, only on main view
- Score badges: IMDb + TMDB only. No subjective badges
- Error panel renders before "No titles found" empty state — distinguishes config-missing (`VITE_API_BASE_URL`) from network-fail with a Retry button
