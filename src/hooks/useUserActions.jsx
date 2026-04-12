import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { apiFetch, hasRecipientToken } from '../lib/api'

const UserActionsContext = createContext()

export function UserActionsProvider({ children }) {
  const [actions, setActions] = useState({})
  const [hasToken, setHasToken] = useState(() => hasRecipientToken())

  useEffect(() => {
    if (!hasToken) return
    let cancelled = false
    apiFetch('/api/actions', { auth: true })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => { if (!cancelled) setActions(data || {}) })
      .catch((err) => {
        if (err.code === 'invalid_recipient_token' || err.code === 'no_recipient_token') {
          if (!cancelled) setHasToken(false)
        } else {
          console.warn('Failed to hydrate user actions:', err.message)
        }
      })
    return () => { cancelled = true }
  }, [hasToken])

  const toggleAction = useCallback((tmdbId, actionType) => {
    if (!hasToken) return
    const key = String(tmdbId)
    let previousActions
    setActions((prev) => {
      previousActions = prev
      const current = prev[key] || {}
      return {
        ...prev,
        [key]: { ...current, [actionType]: !current[actionType] },
      }
    })

    return apiFetch('/api/actions', {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ tmdb_id: tmdbId, action_type: actionType }),
    })
      .then(async (res) => {
        if (!res.ok) {
          // 401 is already handled in apiFetch via throw; any other non-OK → revert
          setActions(previousActions)
          return
        }
        const body = await res.json()
        // Reconcile: trust server's authoritative `active` for this key
        setActions((prev) => {
          const current = prev[key] || {}
          return {
            ...prev,
            [key]: { ...current, [body.action_type]: body.active },
          }
        })
      })
      .catch((err) => {
        if (err.code === 'invalid_recipient_token' || err.code === 'no_recipient_token') {
          setHasToken(false)
          // Don't revert — UI is about to disable buttons anyway
          return
        }
        // Network failure or parse error → revert
        setActions(previousActions)
      })
  }, [hasToken])

  const getActions = useCallback(
    (tmdbId) => actions[String(tmdbId)] || {},
    [actions],
  )

  return (
    <UserActionsContext.Provider value={{ toggleAction, getActions, hasToken }}>
      {children}
    </UserActionsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUserActions() {
  return useContext(UserActionsContext)
}
