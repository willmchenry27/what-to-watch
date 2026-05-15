# React Native Fire TV App With Vega-Ready Architecture

## Summary
Build a separate **React Native TV client** that reuses the existing What to Watch backend/API, while leaving the current web app intact. For the first shippable Fire TV app, use Amazon's React Native for Fire TV path with Expo TV support. Keep the code structure portable so a Vega OS target can be added next, because React Native for Vega is real but still documented as open beta.

References: [Fire TV React Native getting started](https://developer.amazon.com/docs/fire-tv/get-started-with-react-native.html), [Fire TV supported app options](https://developer.amazon.com/docs/fire-tv/get-started-with-fire-tv.html), [React Native for Vega overview](https://developer.amazon.com/docs/vega/0.22/vega-rn-overview.html), [Vega app architecture](https://developer.amazon.com/docs/vega/latest/vega-rn-arch.html).

## Architecture
- Add a new app at `apps/fire-tv/` instead of rewriting the existing Vite web app.
- Use Expo's TV template as the first target: `npx create-expo-app apps/fire-tv -e with-tv`.
- Configure TV mode with `@react-native-tvos/config-tv` and `isTV: true`.
- Reuse the existing production API endpoints: `/api/guide/current`, `/api/actions/*`.
- Keep shared logic small and explicit: copy or extract only pure helpers like ranking, API normalization, and pick grouping. Do not try to share web UI components.
- Treat Vega as a second target after the Fire OS/Expo TV app works. The RN component model, focus patterns, and data layer should be written so they can later move into a Vega SDK app with minimal product redesign.

## TV App UX
- Home screen has large horizontal rows: `Top Rated`, `Fresh Drops`, and optionally `Saved`.
- Each pick is one focusable TV card, not a cluster of tiny buttons.
- D-pad navigation moves between rows/cards; Enter opens a detail panel.
- Back/Escape closes detail panels and returns to the previous row.
- Detail panel shows poster/backdrop, score, platform, synopsis, cast, and actions.
- Hide or defer search for v1; remote text entry is painful.
- Replace external links with internal details. Do not depend on browser tabs or hover states.

## Implementation Steps
- Scaffold `apps/fire-tv/` with Expo TV.
- Add a small TV API client that reads `EXPO_PUBLIC_API_BASE_URL`.
- Build TV screens: `TvHomeScreen`, `TvRow`, `TvCard`, `TvDetailModal`, `TvLoading`, and `TvError`.
- Add focus styling with strong visual borders/scale on focused cards.
- Add remote handling using React Native TV focus primitives and `TVEventHandler` or the Expo TV-supported equivalent.
- Add saved/seen/not-for-me actions only after browsing/navigation feels solid.
- Add Fire TV assets: launcher icon, banner, screenshots, app name, privacy/support URLs.
- Add documentation for local setup, Fire TV device testing, and release build.

## Testing
- Run the current web app checks unchanged: `pnpm run build`.
- In `apps/fire-tv/`, run Expo lint/build checks once configured.
- Test on Android TV emulator first.
- Test on a real Fire TV device over ADB.
- Verify D-pad-only flow: open app, move rows/cards, open details, go back, switch rows, no dead-end focus traps.
- Verify API failure state and loading state on TV.
- Confirm the web app remains untouched and deployable.

## Release Path
- First release target: Fire TV Appstore using the React Native/Expo Fire TV app.
- Submit through Amazon Developer Console with TV screenshots, icons, description, privacy policy, and support URL.
- Second target: create a Vega SDK project and port the same RN screen/data layer once the Fire OS version is stable.
- Do not start with Vega-only unless you specifically have a Vega device or Amazon beta target ready.

## Assumptions
- Goal is a public Amazon Appstore Fire TV app.
- V1 is a recommendation/browsing app, not a video playback app.
- Existing Railway/API backend remains the source of truth.
- Existing React web app stays as-is.
- Fire OS React Native ships first; Vega support is designed for, then added as a follow-up target.
