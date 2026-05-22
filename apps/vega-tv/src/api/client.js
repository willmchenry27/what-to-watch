import { API_BASE_URL as RESOLVED_BASE_URL } from '../config'

export const API_BASE_URL = RESOLVED_BASE_URL

class ApiError extends Error {
  constructor(message, { status } = {}) {
    super(message)
    this.status = status
  }
}

async function apiFetch(path, { signal, ...init } = {}) {
  const headers = new Headers(init.headers || {})
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, signal })
  if (!res.ok) {
    throw new ApiError(`HTTP ${res.status}`, { status: res.status })
  }
  return res
}

export async function fetchCurrentGuide({ signal } = {}) {
  const res = await apiFetch('/api/guide/current', { signal })
  return res.json()
}

export function tmdbImage(path, size = 'w500') {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `https://image.tmdb.org/t/p/${size}${path}`
}
