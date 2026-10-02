import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { clearToken, getToken, setToken } from '@/api/token'
import { authApi } from './api'
import {
  AuthContext,
  type AuthContextValue,
  type AuthState,
} from './auth-context'

const ANONYMOUS: AuthState = { status: 'anonymous', user: null }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    getToken() ? { status: 'loading', user: null } : ANONYMOUS,
  )

  // Restores the session on page load. A token that the API no longer accepts
  // (expired, or the account was deactivated) is discarded.
  useEffect(() => {
    if (!getToken()) {
      return
    }
    let cancelled = false
    authApi
      .getMe()
      .then((user) => {
        if (!cancelled) {
          setState({ status: 'authenticated', user })
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearToken()
          setState(ANONYMOUS)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  // The token only identifies the user; the full user (with profile or
  // company name) is loaded from /auth/me.
  const loginWithToken = useCallback(async (accessToken: string) => {
    setToken(accessToken)
    try {
      const user = await authApi.getMe()
      setState({ status: 'authenticated', user })
    } catch (error) {
      clearToken()
      throw error
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login: async (input) => {
        const { accessToken } = await authApi.login(input)
        await loginWithToken(accessToken)
      },
      loginWithToken,
      refreshUser: async () => {
        const user = await authApi.getMe()
        setState({ status: 'authenticated', user })
      },
      logout: () => {
        clearToken()
        setState(ANONYMOUS)
      },
    }),
    [state, loginWithToken],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
