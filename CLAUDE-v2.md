# What to Watch v2 — Production Roadmap

## Current State (v1)
Working prototype: React/Vite frontend + Express/SQLite backend running locally. Full data pipeline (TMDB → OMDb → ranked guides), weekly email via Resend with TMDB fallback scores, hyperlinked titles, platform badges, and archive browsing. Cron runs Fridays at 2pm ET.

## v2 Goals
Ship a production-ready app that runs unattended and can be shared with others.

---

## Phase 8 — Production Deployment

### 8.1 — Hosting & Infrastructure
- [ ] Deploy backend to a cloud provider (Railway, Render, Fly.io, or VPS)
- [ ] Migrate SQLite → PostgreSQL (or use Litestream for SQLite replication)
- [ ] Deploy frontend as static build (`npm run build` → CDN/Vercel/Netlify)
- [ ] Set up environment variables in production (API keys, NOTIFICATION_EMAIL)
- [ ] Custom domain + SSL

### 8.2 — Persistent Scheduling
- [ ] Replace in-process node-cron with a production scheduler (Railway cron job, systemd timer, or cloud scheduler)
- [ ] Ensure pipeline runs reliably even after server restarts
- [ ] Add health check endpoint (`GET /api/health`)

### 8.3 — Email Upgrades
- [ ] Move from Resend sandbox (`onboarding@resend.dev`) to verified custom domain sender
- [ ] Support multiple subscribers (subscriber list in DB or Resend audience)
- [ ] Unsubscribe link in email footer
- [ ] Email delivery monitoring / error alerts

---

## Phase 9 — Data Pipeline Hardening

### 9.1 — Score Reliability
- [ ] Retry OMDb with fuzzy title matching (strip subtitles, try without year)
- [ ] TMDB vote_average fallback already implemented — document threshold (e.g., require vote_count >= 5 to reduce noise from 1-2 vote titles)
- [ ] Log and alert on pipeline failures (e.g., TMDB/OMDb API down)

### 9.2 — Content Quality
- [ ] Filter out non-English titles (or make language configurable)
- [ ] Deduplicate titles that appear in both movie and TV results
- [ ] Handle edge cases: specials, documentaries, anime (configurable filters)
- [ ] Pagination: fetch more than 20 results per TMDB endpoint for fuller coverage

### 9.3 — Watch Provider Improvements
- [ ] Expand PROVIDER_MAP with more services (Max, Starz, Crunchyroll, etc.)
- [ ] Re-fetch providers for ALL simmered picks (not just missing ones — providers change)

---

## Phase 10 — Frontend Polish

### 10.1 — UI Enhancements
- [ ] Click-through to title detail page (trailer embed, full cast, reviews)
- [ ] "Where to Watch" deep links (JustWatch, direct streaming app links)
- [ ] Social sharing (share a pick or the full weekly guide)
- [ ] PWA support (installable, offline-capable with cached last guide)

### 10.2 — Personalization
- [ ] Genre preferences / filters that persist
- [ ] Watchlist (save titles to watch later, stored in localStorage or DB)
- [ ] "Already watched" toggle to hide titles

---

## Phase 11 — Multi-User & Growth

### 11.1 — User Accounts (if needed)
- [ ] Auth (magic link via email, or OAuth with Google)
- [ ] Per-user preferences and watchlist
- [ ] Email subscription self-service (subscribe/unsubscribe page)

### 11.2 — Distribution
- [ ] Landing page explaining the product
- [ ] SEO: server-side rendering or pre-rendering for guide pages
- [ ] Open Graph / social media preview cards
- [ ] Analytics (Plausible, PostHog, or similar privacy-respecting tool)

---

## Tech Decisions to Make
- **Database:** Stay with SQLite (+ Litestream) or migrate to PostgreSQL?
- **Hosting:** Serverless (Vercel/Netlify functions) vs. long-running server (Railway/Fly)?
- **Auth:** Magic link vs. OAuth vs. none (email-only product)?
- **Monetization:** Free forever? Donations? Premium tier with extra features?

## Environment Variables (v2 additions)
- `DATABASE_URL` — if migrating to PostgreSQL
- `BASE_URL` — production app URL (for email links, unsubscribe)
- `RESEND_AUDIENCE_ID` — if using Resend audiences for subscriber management
