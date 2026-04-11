# What to Watch

A weekly streaming guide ranked by aggregated critic scores — not algorithms.

## What it does

Two sections, every week:

- **Fresh Drops** — new releases this week, sorted by buzz. No critic scores yet (they take time to settle), so these are surfaced by interest, not rating.
- **Top Rated** — releases from the previous **4 weeks** that now have settled IMDb / Rotten Tomatoes / TMDB scores, ranked by a combined score. Up to 10 total titles, including the hero card.

If fewer than 10 picks have meaningful scores, Top Rated shows fewer than 10. The list is intentionally not padded with unscored or low-confidence titles — quality over count.

## How it runs

Two GitHub Actions workflows handle production scheduling:

| Workflow | Schedule | What it does |
|---|---|---|
| `.github/workflows/weekly-guide.yml` | Friday 2 PM ET | Generates the guide and sends a personalized email to every recipient in `NOTIFICATION_EMAIL`. |
| `.github/workflows/midweek-refresh.yml` | Tuesday 2 PM ET | Refreshes the guide in the database (so the website is current) without sending any email. |

GitHub Actions is the production scheduler. The Express backend has an in-process cron, but it's **off by default** — set `ENABLE_INTERNAL_SCHEDULER=true` to opt in. This avoids accidental duplicate sends if you ever run `node server/index.js` standalone alongside Actions.

## Recipient-scoped state

Action state (watch / save / seen / dismiss) is stored per email recipient in the `recipient_actions` table, keyed by `(recipient_email, tmdb_id, action_type)`. There is no user account system — recipients prove their identity via an opaque AES-256-GCM token (`?r=...` in email links, `X-Recipient-Token` header on web requests). Tokens are minted by the backend and embedded in every weekly email.

The website is browseable without a token, but the action buttons are disabled until you open the site from your weekly email (which bootstraps the token into `localStorage`).

## Local dev

```bash
npm install
npm run dev    # concurrently runs vite (5173) + express (3001)
```

Required env vars in `server/.env`:

```
TMDB_API_KEY=...
OMDB_API_KEY=...
TURSO_DATABASE_URL=...
TURSO_AUTH_TOKEN=...
ACTION_LINK_SECRET=...   # 32-byte hex; AES key is derived via SHA-256
API_PUBLIC_URL=...       # absolute URL of the backend (used in email links)
APP_URL=...              # absolute URL of the frontend (used in email CTA)
NOTIFICATION_EMAIL=...   # comma-separated recipient list
RESEND_API_KEY=...
```

Frontend env (root `.env`):

```
VITE_API_BASE_URL=http://localhost:3001
```

## Manual pipeline runs

```bash
# Friday-style: generate + email recipients (default mode)
cd server && node scripts/run-pipeline.js

# Tuesday-style: refresh DB only, no emails
cd server && PIPELINE_MODE=refresh-only node scripts/run-pipeline.js
```

`PIPELINE_MODE` accepts `email` (default) or `refresh-only`. Any other value throws.

## Tech stack

- React 19 + Vite + Tailwind CSS 4
- Node.js + Express
- Turso (libSQL / serverless SQLite)
- Resend (email)
- Puppeteer (TMDB / IMDB scraping)
