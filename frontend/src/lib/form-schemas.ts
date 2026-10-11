import { z } from 'zod'
import { key } from '@/features/auth/schemas'

// Building blocks for optional form fields. Forms keep '' for "empty", so
// every check here accepts the empty string. The limits mirror the backend
// DTOs.

export const optionalText = (max: number) =>
  z.string().trim().max(max, key('validation.tooLong'))

export const optionalPhone = z
  .string()
  .trim()
  .refine((value) => value === '' || /^[0-9+()\-\s]{6,30}$/.test(value), {
    message: key('validation.phoneInvalid'),
  })

export const optionalUrl = z
  .string()
  .trim()
  .max(500, key('validation.tooLong'))
  .refine((value) => value === '' || isHttpUrl(value), {
    message: key('validation.urlInvalid'),
  })

// Value of an <input type="date">: '' or YYYY-MM-DD.
export const optionalPastDate = z
  .string()
  .refine((value) => value === '' || !Number.isNaN(Date.parse(value)), {
    message: key('validation.dateInvalid'),
  })
  .refine((value) => value === '' || value <= todayIsoDate(), {
    message: key('validation.dateInFuture'),
  })

function isHttpUrl(value: string): boolean {
  try {
    const { protocol, hostname } = new URL(value)
    return (
      (protocol === 'http:' || protocol === 'https:') && hostname.includes('.')
    )
  } catch {
    return false
  }
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}
