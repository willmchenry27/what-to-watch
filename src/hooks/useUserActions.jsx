import { useState, useEffect, useCallback, createContext, useContext } from 'react'

const API_BASE = 'http://localhost:3001'

const UserActionsContext = createContext()

export function UserActionsProvider({ children }) {
  const [actions, setActions] = useState({})

  useEffect(() => {
    fetch(`${API_BASE}/api/actions`)
      .then((res) => res.ok ? res.json() : {})
      .then(setActions)
      .catch(() => {})
  }, [])

  const toggleAction = useCallback((tmdbId, actionType) => {
    setActions((prev) => {
      const key = String(tmdbId)
      const current = prev[key] || {}
      const updated = {
        ...prev,
        [key]: { ...current, [actionType]: !current[actionType] },
      }
      return updated
    })

    fetch(`${API_BASE}/api/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: tmdbId, action_type: actionType }),
    }).catch(() => {})
  }, [])

  const getActions = useCallback(
    (tmdbId) => actions[String(tmdbId)] || {},
    [actions],
  )

  return (
    <UserActionsContext.Provider value={{ toggleAction, getActions }}>
      {children}
    </UserActionsContext.Provider>
  )
}

export function useUserActions() {
  return useContext(UserActionsContext)
}
