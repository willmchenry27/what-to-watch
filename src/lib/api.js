// Centralized API client: resolves base URL, manages recipient token, and injects
// X-Recipient-Token on requests that require recipient scope.

const TOKEN_STORAGE_KEY = 'wtw_recipient_token'

function resolveApiBase() {
  const configured = import.meta.env.VITE_API_BASE_URL
  if (configured) return configured.replace(/\/+$/, '')
  if (import.meta.env.DEV) return 'http://localhost:3001'
  return null // production without config → explicit error
}

export const API_BASE = resolveApiBase()
export const API_MISCONFIGURED = API_BASE === null

// On module load in the browser, harvest ?r=<token> from URL and persist it.
function bootstrapTokenFromUrl() {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  const r = params.get('r')
  if (r) {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, r)
    } catch { /* ignore storage errors */ }
    params.delete('r')
    const qs = params.toString()
    const newUrl = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash
    window.history.replaceState({}, '', newUrl)
  }
}
bootstrapTokenFromUrl()

export function getRecipientToken() {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function hasRecipientToken() {
  return Boolean(getRecipientToken())
}

export function clearRecipientToken() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch { /* ignore storage errors */ }
}

// apiFetch(path, { auth: true }) — pass auth:true to include X-Recipient-Token
export async function apiFetch(path, { auth = false, ...init } = {}) {
  if (API_MISCONFIGURED) {
    throw new Error('VITE_API_BASE_URL is not configured')
  }
  const headers = new Headers(init.headers || {})
  if (auth) {
    const token = getRecipientToken()
    if (!token) {
      const err = new Error('no_recipient_token')
      err.code = 'no_recipient_token'
      throw err
    }
    headers.set('X-Recipient-Token', token)
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (res.status === 401 && auth) {
    // Token rejected by server — clear it so UI falls back to disabled state
    clearRecipientToken()
    const err = new Error('invalid_recipient_token')
    err.code = 'invalid_recipient_token'
    throw err
  }
  return res
}
