import { API_BASE_URL as RESOLVED_BASE_URL, RECIPIENT_TOKEN as RESOLVED_TOKEN } from '../config'

export const API_BASE_URL = RESOLVED_BASE_URL
export const RECIPIENT_TOKEN = RESOLVED_TOKEN
export const HAS_RECIPIENT_TOKEN = Boolean(RECIPIENT_TOKEN)

class ApiError extends Error {
  constructor(message, { code, status } = {}) {
    super(message)
    this.code = code
    this.status = status
  }
}

async function apiFetch(path, { auth = false, signal, ...init } = {}) {
  const headers = new Headers(init.headers || {})
  if (auth) {
    if (!RECIPIENT_TOKEN) {
      throw new ApiError('no_recipient_token', { code: 'no_recipient_token' })
    }
    headers.set('X-Recipient-Token', RECIPIENT_TOKEN)
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, signal })
  if (res.status === 401 && auth) {
    throw new ApiError('invalid_recipient_token', { code: 'invalid_recipient_token', status: 401 })
  }
  if (!res.ok) {
    throw new ApiError(`HTTP ${res.status}`, { status: res.status })
  }
  return res
}

export async function fetchCurrentGuide({ signal } = {}) {
  const res = await apiFetch('/api/guide/current', { signal })
  return res.json()
}

export async function fetchUserActions({ signal } = {}) {
  const res = await apiFetch('/api/actions', { auth: true, signal })
  return res.json()
}

export async function fetchSavedPicks({ signal } = {}) {
  const res = await apiFetch('/api/actions/saved', { auth: true, signal })
  return res.json()
}

export async function toggleUserAction(tmdbId, actionType) {
  const res = await apiFetch('/api/actions', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ tmdb_id: tmdbId, action_type: actionType }),
  })
  return res.json()
}

export function tmdbImage(path, size = 'w500') {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `https://image.tmdb.org/t/p/${size}${path}`
}
