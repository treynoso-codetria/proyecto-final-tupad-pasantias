import { z } from 'zod'
import { email, key, newPassword } from '@/features/auth/schemas'

const currentPassword = z.string().min(1, key('validation.passwordRequired'))

export const changeEmailSchema = z.object({
  newEmail: email,
  currentPassword,
})

export const changePasswordSchema = z
  .object({
    currentPassword,
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: key('validation.passwordsDontMatch'),
  })
