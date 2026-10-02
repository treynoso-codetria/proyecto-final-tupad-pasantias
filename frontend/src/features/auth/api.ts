import { apiFetch } from '@/api/client'
import type {
  AuthResponse,
  CurrentUser,
  LoginInput,
  RegisterEmployerInput,
  RegisterResponse,
  RegisterStudentInput,
} from './types'

export const authApi = {
  login: (input: LoginInput) =>
    apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: input }),

  registerStudent: (input: RegisterStudentInput) =>
    apiFetch<RegisterResponse>('/auth/register/student', {
      method: 'POST',
      body: input,
    }),

  registerEmployer: (input: RegisterEmployerInput) =>
    apiFetch<RegisterResponse>('/auth/register/employer', {
      method: 'POST',
      body: input,
    }),

  // `token` comes from the link in the verification email.
  verifyEmail: (token: string) =>
    apiFetch<AuthResponse>('/auth/verify-email', {
      method: 'POST',
      body: { token },
    }),

  resendVerification: (email: string) =>
    apiFetch<void>('/auth/resend-verification', {
      method: 'POST',
      body: { email },
    }),

  getMe: () => apiFetch<CurrentUser>('/auth/me'),
}
