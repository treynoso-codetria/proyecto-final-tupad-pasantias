import { z } from 'zod'
import type { ErrorKey } from './errors'

// These limits mirror the backend DTOs (backend/src/modules/auth/dto).
// Messages are translation keys, see errors.ts.
export const key = (errorKey: ErrorKey) => errorKey

export const email = z
  .string()
  .trim()
  .min(1, key('validation.emailRequired'))
  .max(255, key('validation.tooLong'))
  .pipe(z.email(key('validation.emailInvalid')))

export const newPassword = z
  .string()
  .min(8, key('validation.passwordTooShort'))
  .max(72, key('validation.passwordTooLong'))

const requiredText = (max: number) =>
  z
    .string()
    .trim()
    .min(1, key('validation.required'))
    .max(max, key('validation.tooLong'))

export const loginSchema = z.object({
  email,
  password: z.string().min(1, key('validation.passwordRequired')),
})

export const registerStudentSchema = z.object({
  firstName: requiredText(100),
  lastName: requiredText(100),
  email,
  password: newPassword,
  career: requiredText(150),
  institution: requiredText(150),
})

export const registerEmployerSchema = z.object({
  companyName: requiredText(150),
  cuit: z.string().regex(/^\d{2}-\d{8}-\d$/, key('validation.cuitInvalid')),
  email,
  password: newPassword,
})

// Formats what the user types as XX-XXXXXXXX-X, ignoring non-digits.
export function formatCuit(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return [digits.slice(0, 2), digits.slice(2, 10), digits.slice(10)]
    .filter(Boolean)
    .join('-')
}
