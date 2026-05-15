import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { HAS_RECIPIENT_TOKEN, fetchUserActions, toggleUserAction } from '../api/client'

const UserActionsContext = createContext({
  actions: {},
  hasToken: false,
  isAction: () => false,
  toggle: () => {},
})

export function UserActionsProvider({ children }) {
  const [actions, setActions] = useState({})
  const [hasToken, setHasToken] = useState(HAS_RECIPIENT_TOKEN)

  useEffect(() => {
    if (!hasToken) return undefined
    let cancelled = false
    const controller = new AbortController()
    fetchUserActions({ signal: controller.signal })
      .then((data) => {
        if (!cancelled) setActions(data || {})
      })
      .catch((err) => {
        if (cancelled || err.name === 'AbortError') return
        if (err.code === 'invalid_recipient_token' || err.code === 'no_recipient_token') {
          setHasToken(false)
        } else {
          console.warn('Failed to hydrate user actions:', err.message)
        }
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [hasToken])

  const toggle = useCallback(
    async (tmdbId, actionType) => {
      if (!hasToken) return
      const key = String(tmdbId)
      let previous
      setActions((prev) => {
        previous = prev
        const current = prev[key] || {}
        return { ...prev, [key]: { ...current, [actionType]: !current[actionType] } }
      })
      try {
        const body = await toggleUserAction(tmdbId, actionType)
        setActions((prev) => {
          const current = prev[key] || {}
          return { ...prev, [key]: { ...current, [body.action_type]: body.active } }
        })
      } catch (err) {
        if (err.code === 'invalid_recipient_token' || err.code === 'no_recipient_token') {
          setHasToken(false)
          return
        }
        setActions(previous)
      }
    },
    [hasToken],
  )

  const isAction = useCallback(
    (tmdbId, actionType) => Boolean(actions[String(tmdbId)]?.[actionType]),
    [actions],
  )

  return (
    <UserActionsContext.Provider value={{ actions, hasToken, isAction, toggle }}>
      {children}
    </UserActionsContext.Provider>
  )
}

export function useUserActions() {
  return useContext(UserActionsContext)
}
