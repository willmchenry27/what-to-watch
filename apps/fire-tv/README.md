# What to Watch — Fire TV App

React Native TV client for the [What to Watch](../../README.md) backend. Built with Expo + `react-native-tvos` to ship on Amazon Fire TV first, with the option to port the same screens to Vega OS as a follow-up. Reuses the production Express API — no separate backend.

## Stack
- Expo SDK 55 + `react-native-tvos@0.83`
- `@react-native-tvos/config-tv` Expo config plugin
- Plain JavaScript (no TypeScript) — project convention
- Talks to the existing API: `GET /api/guide/current`, `GET /api/actions`, `POST /api/actions`

## Package manager: pnpm (this app only)

The root web app uses **npm** (see root `README.md`); this Fire TV app uses **pnpm**. Don't mix them — keep `pnpm-lock.yaml` here and `package-lock.json` at the repo root. Where Expo docs say `npm install`/`yarn`, use `pnpm install`. Where they show `npx expo …`, use `pnpm exec expo …` (or `pnpm <script>` for entries in `package.json`'s `scripts`).

```bash
pnpm install
```

## Configure env

The app reads two `EXPO_PUBLIC_*` vars at bundle time. Copy `.env.example` to `.env` and fill in:

```bash
# .env  (gitignored)
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:3001
EXPO_PUBLIC_RECIPIENT_TOKEN=
```

**`EXPO_PUBLIC_API_BASE_URL`** — base URL for the Express backend. `localhost` will not resolve from an Android TV emulator or a Fire TV stick on your network; set this to your dev machine's LAN IP. Find it with:

```bash
ipconfig getifaddr en0   # macOS Wi-Fi
```

**`EXPO_PUBLIC_RECIPIENT_TOKEN`** — the per-recipient HMAC token used by `Save` / `Seen it` / `Not for me` actions. The web app harvests this from the `?r=…` query param in email action links. On TV there's no email handoff, so you paste the same value here once. Leave blank to disable per-user actions (rows still render, action buttons become greyed out with a hint).

## Run

**Android TV emulator (recommended first target — covers Fire TV's runtime closely):**

```bash
EXPO_TV=1 pnpm prebuild:tv
pnpm android
```

`EXPO_TV=1` is what the TV config plugin reads to flip the native project into TV mode (Android `isTV: true`, leanback intent filter, banner asset).

**Apple TV (tvOS) — local dev only, not a release target:**

```bash
EXPO_TV=1 pnpm prebuild:tv
pnpm ios
```

**Start Metro alone (against a previously-built native shell):**

```bash
pnpm start
```

## Fire TV device testing over ADB

1. On the Fire TV stick: **Settings → My Fire TV → About**, click "Build" seven times to enable Developer Options.
2. Enable **ADB Debugging**.
3. From the dev machine:
   ```bash
   adb connect <fire-tv-ip>:5555
   adb devices                # confirm the stick is listed
   EXPO_TV=1 pnpm android     # builds and installs the dev APK
   ```
4. Verify D-pad navigation:
   - Up/down moves between rows; left/right between cards
   - Every focused card has a visible accent border + scale
   - Enter opens the detail modal; Back closes it
   - No focus traps (every row reachable, no dead-end card)

## UX rules (v1)

- Two horizontal rows: **Top Rated**, **Fresh Drops**. Top Rated uses the same recency-aware sort as the web app and weekly email.
- Cards are large and singly-focusable — no nested buttons inside a card.
- Actions (Save / Seen / Not for me / Close) live in the detail modal, not on the card.
- No remote-driven text entry. **No search in v1.**
- No external links. Everything stays in-app.
- Seen and dismissed picks are filtered out of both rows (matches the email digest filter behavior).

## Project layout

```
apps/fire-tv/
├─ App.js                          # mounts UserActionsProvider + TvHomeScreen
├─ app.json                        # Expo config + @react-native-tvos/config-tv plugin
├─ src/
│  ├─ api/client.js                # fetch wrapper, X-Recipient-Token, TMDB image helper
│  ├─ components/
│  │  ├─ ActionButton.js           # focusable pill, active/disabled/danger states
│  │  ├─ ScoreBadge.js             # ScoreBadgeRow: combined "SCORE" + IMDb + RT
│  │  ├─ TvCard.js                 # focus = scale + accent border + glow
│  │  ├─ TvDetailModal.js          # detail panel with action row, hardware Back
│  │  ├─ TvError.js
│  │  ├─ TvLoading.js
│  │  └─ TvRow.js                  # horizontal FlatList of cards
│  ├─ hooks/
│  │  ├─ useGuide.js               # fetch /api/guide/current with abort
│  │  └─ useUserActions.js         # provider + optimistic toggle for save/seen/dismiss
│  ├─ lib/grouping.js              # cohort blending + recency-aware Top Rated sort
│  ├─ screens/TvHomeScreen.js
│  └─ theme/colors.js
```

## Known limitations (v1)

- **No search.** Remote text entry is painful on TV; deferred until there's a real demand.
- **Token onboarding is manual.** You paste `EXPO_PUBLIC_RECIPIENT_TOKEN` once. A device-pairing flow (TV shows a code, web app confirms) is out of scope for v1.
- **No offline cache.** A network failure on launch shows the error screen; we don't render last-known-good data. The data layer is intentionally thin to keep the Vega port small.
- **No Saved row yet.** The detail modal supports Save, and the card shows a "★ Saved" indicator when set, but there's no dedicated row pulling from `/api/actions/saved`.
- **Hero card is not used.** The web app features the #1 simmered pick in a cinematic hero; for TV this is replaced by row-first browsing because the D-pad doesn't need a hero entry point.
- **Web target is not maintained.** `pnpm web` works because Expo lights it up, but the focus/Pressable styling is tuned for TV; treat web as a debug aid only.
- **Resend sender constraint is unchanged.** The token belongs to whatever email the digest is sent to; while the backend uses `onboarding@resend.dev`, only the Resend account owner gets a valid token. See `CLAUDE.md → Runbook: Resend Sender Address` to widen the recipient list.

## Vega OS path

Vega is the eventual second target. Things written to stay portable:

- Pure JS data layer (`src/api/`, `src/hooks/`, `src/lib/`)
- Component composition without Fire-OS-specific imports
- Focus model expressed via standard RN props (`hasTVPreferredFocus`, `Pressable`'s `focused` state, `BackHandler`)

When porting, expect to swap the entry point and the Expo config plugin for the Vega SDK equivalents. Screens and data should be reusable as-is.
