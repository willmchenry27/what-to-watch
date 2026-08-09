/* global process, require */

// API config for Vega build.
// Order of precedence:
//   1. src/config.local.js (gitignored — your dev machine LAN IP)
//   2. process.env.API_BASE_URL (if Metro/Vega exposes it at bundle time)
//   3. http://localhost:3001 fallback (only useful when running on the host itself;
//      VVD is QEMU and "localhost" inside the guest is the guest, not the Mac)

let local = {}
try {
  local = require('./config.local').default || {}
} catch {
  // No local override file — fine, fall through.
}

// NOTE: process.env.API_BASE_URL is best-effort and currently inert. Vega's
// Metro bundler does not inline arbitrary env vars (only NODE_ENV is
// substituted by default). To make this path live, add
// babel-plugin-transform-inline-environment-variables to babel.config.js.
// Until then, prefer src/config.local.js for the dev IP.
const FROM_ENV =
  typeof process !== 'undefined' && process.env && process.env.API_BASE_URL
    ? process.env.API_BASE_URL
    : null

export const API_BASE_URL = (local.API_BASE_URL || FROM_ENV || 'http://localhost:3001').replace(
  /\/$/,
  '',
)

// Recipient token: the web app harvests this from email links (?r=...); on TV
// there's no way to receive that link, so it's pasted once into config.local.js.
export const RECIPIENT_TOKEN = local.RECIPIENT_TOKEN || null
