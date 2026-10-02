import { apiFetch } from '@/api/client'

export const accountApi = {
  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    apiFetch<void>('/users/me/password', { method: 'PATCH', body: input }),

  // Sends a confirmation link to `newEmail`; the email changes when that
  // link is opened.
  requestEmailChange: (input: { newEmail: string; currentPassword: string }) =>
    apiFetch<void>('/users/me/email-change', { method: 'POST', body: input }),

  // `token` comes from the link in the confirmation email.
  confirmEmailChange: (token: string) =>
    apiFetch<{ email: string }>('/users/email-change/confirm', {
      method: 'POST',
      body: { token },
    }),
}
