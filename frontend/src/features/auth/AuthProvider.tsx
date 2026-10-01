import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { clearToken, getToken, setToken } from '@/api/token'
import { authApi } from './api'
import {
  AuthContext,
  type AuthContextValue,
  type AuthState,
} from './auth-context'
import type { AuthResponse } from './types'

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

  // Login and registration both return a token; the full user (with profile
  // or company name) is then loaded from /auth/me.
  const startSession = useCallback(async (request: Promise<AuthResponse>) => {
    const { accessToken } = await request
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
      login: (input) => startSession(authApi.login(input)),
      registerStudent: (input) => startSession(authApi.registerStudent(input)),
      registerEmployer: (input) =>
        startSession(authApi.registerEmployer(input)),
      logout: () => {
        clearToken()
        setState(ANONYMOUS)
      },
    }),
    [state, startSession],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
