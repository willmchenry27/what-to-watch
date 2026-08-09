import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  HAS_RECIPIENT_TOKEN,
  fetchSavedPicks,
  fetchUserActions,
  toggleUserAction,
} from '../api/client'

const UserActionsContext = createContext({
  actions: {},
  savedPicks: [],
  hasToken: false,
  ready: true,
  error: null,
  isAction: () => false,
  isPending: () => false,
  toggle: async () => null,
  clearError: () => {},
})

export function UserActionsProvider({ children }) {
  const [actions, setActions] = useState({})
  const [savedPicks, setSavedPicks] = useState([])
  const [hasToken, setHasToken] = useState(HAS_RECIPIENT_TOKEN)
  const [ready, setReady] = useState(!HAS_RECIPIENT_TOKEN)
  const [pending, setPending] = useState({})
  const [error, setError] = useState(null)
  const pendingRef = useRef(new Set())

  useEffect(() => {
    if (!hasToken) return undefined
    let cancelled = false
    const controller = new AbortController()
    Promise.all([
      fetchUserActions({ signal: controller.signal }),
      fetchSavedPicks({ signal: controller.signal }),
    ])
      .then(([actionData, savedData]) => {
        if (!cancelled) {
          setActions(actionData || {})
          setSavedPicks(Array.isArray(savedData) ? savedData : [])
          setError(null)
        }
      })
      .catch((err) => {
        if (cancelled || err.name === 'AbortError') return
        if (err.code === 'invalid_recipient_token' || err.code === 'no_recipient_token') {
          setHasToken(false)
          setActions({})
          setSavedPicks([])
          setError('Personal actions are unavailable. The guide remains read-only.')
        } else {
          console.warn('Failed to hydrate user actions:', err.message)
          setError("Couldn't load your saved actions. You can still browse the guide.")
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [hasToken])

  const toggle = useCallback(
    async (tmdbId, actionType) => {
      if (!hasToken || !ready || tmdbId == null) return null
      const itemKey = String(tmdbId)
      const requestKey = `${itemKey}:${actionType}`
      if (pendingRef.current.has(requestKey)) return null

      pendingRef.current.add(requestKey)
      setPending((current) => ({ ...current, [requestKey]: true }))
      setError(null)
      try {
        const body = await toggleUserAction(tmdbId, actionType)
        setActions((prev) => {
          const current = prev[itemKey] || {}
          return {
            ...prev,
            [itemKey]: { ...current, [body.action_type]: body.active },
          }
        })
        if (body.action_type === 'save') {
          if (body.active) {
            try {
              const savedData = await fetchSavedPicks()
              setSavedPicks(Array.isArray(savedData) ? savedData : [])
            } catch (savedError) {
              if (
                savedError.code === 'invalid_recipient_token' ||
                savedError.code === 'no_recipient_token'
              ) {
                setHasToken(false)
                setActions({})
                setSavedPicks([])
                setError('Personal actions are unavailable. The guide remains read-only.')
              } else {
                console.warn('Failed to refresh saved picks:', savedError.message)
                setError("Saved, but couldn't refresh your Saved row. Reopen the app to retry.")
              }
            }
          } else {
            setSavedPicks((current) =>
              current.filter((pick) => String(pick.tmdb_id) !== itemKey),
            )
          }
        }
        return body
      } catch (err) {
        if (err.code === 'invalid_recipient_token' || err.code === 'no_recipient_token') {
          setHasToken(false)
          setActions({})
          setSavedPicks([])
          setError('Personal actions are unavailable. The guide remains read-only.')
        } else {
          console.warn('Failed to toggle user action:', err.message)
          setError("Couldn't update that action. Please try again.")
        }
        return null
      } finally {
        pendingRef.current.delete(requestKey)
        setPending((current) => {
          const next = { ...current }
          delete next[requestKey]
          return next
        })
      }
    },
    [hasToken, ready],
  )

  const isAction = useCallback(
    (tmdbId, actionType) => Boolean(actions[String(tmdbId)]?.[actionType]),
    [actions],
  )

  const isPending = useCallback(
    (tmdbId, actionType) => Boolean(pending[`${String(tmdbId)}:${actionType}`]),
    [pending],
  )

  const clearError = useCallback(() => setError(null), [])

  return (
    <UserActionsContext.Provider
      value={{
        actions,
        savedPicks,
        hasToken,
        ready,
        error,
        isAction,
        isPending,
        toggle,
        clearError,
      }}
    >
      {children}
    </UserActionsContext.Provider>
  )
}

export function useUserActions() {
  return useContext(UserActionsContext)
}
