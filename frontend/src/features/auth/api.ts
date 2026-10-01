import { apiFetch } from '@/api/client'
import type {
  AuthResponse,
  CurrentUser,
  LoginInput,
  RegisterEmployerInput,
  RegisterStudentInput,
} from './types'

export const authApi = {
  login: (input: LoginInput) =>
    apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: input }),

  registerStudent: (input: RegisterStudentInput) =>
    apiFetch<AuthResponse>('/auth/register/student', {
      method: 'POST',
      body: input,
    }),

  registerEmployer: (input: RegisterEmployerInput) =>
    apiFetch<AuthResponse>('/auth/register/employer', {
      method: 'POST',
      body: input,
    }),

  getMe: () => apiFetch<CurrentUser>('/auth/me'),
}
