import { createContext, useContext } from 'react'
import type { CurrentUser, LoginInput } from './types'

export type AuthState =
  // A stored token is being checked against the API.
  | { status: 'loading'; user: null }
  | { status: 'anonymous'; user: null }
  | { status: 'authenticated'; user: CurrentUser }

export type AuthContextValue = AuthState & {
  login: (input: LoginInput) => Promise<void>
  // Starts a session from an access token obtained outside the login form
  // (the email verification link returns one).
  loginWithToken: (accessToken: string) => Promise<void>
  // Reloads the signed-in user, e.g. after their email changed.
  refreshUser: () => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return value
}
