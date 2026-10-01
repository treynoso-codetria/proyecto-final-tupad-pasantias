import { createContext, useContext } from 'react'
import type {
  CurrentUser,
  LoginInput,
  RegisterEmployerInput,
  RegisterStudentInput,
} from './types'

export type AuthState =
  // A stored token is being checked against the API.
  | { status: 'loading'; user: null }
  | { status: 'anonymous'; user: null }
  | { status: 'authenticated'; user: CurrentUser }

export type AuthContextValue = AuthState & {
  login: (input: LoginInput) => Promise<void>
  registerStudent: (input: RegisterStudentInput) => Promise<void>
  registerEmployer: (input: RegisterEmployerInput) => Promise<void>
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
