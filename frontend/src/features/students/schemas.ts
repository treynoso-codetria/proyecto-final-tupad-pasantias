import { z } from 'zod'
import { requiredText } from '@/features/auth/schemas'
import {
  optionalPastDate,
  optionalPhone,
  optionalText,
  optionalUrl,
} from '@/lib/form-schemas'
import { toFormText, toNullableText } from '@/lib/form-values'
import type { StudentProfile, UpdateStudentProfileInput } from './api'

export const STUDY_YEARS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

export const studentProfileSchema = z.object({
  firstName: requiredText(100),
  lastName: requiredText(100),
  birthDate: optionalPastDate,
  phone: optionalPhone,
  career: requiredText(150),
  institution: requiredText(150),
  // Values of <select> elements; '' = not specified.
  studyYear: z.string(),
  province: z.string(),
  city: optionalText(100),
  bio: optionalText(2000),
  portfolioUrl: optionalUrl,
})

export type StudentProfileFormValues = z.infer<typeof studentProfileSchema>

export function toFormValues(profile: StudentProfile): StudentProfileFormValues {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    birthDate: toFormText(profile.birthDate),
    phone: toFormText(profile.phone),
    career: profile.career,
    institution: profile.institution,
    studyYear: toFormText(profile.studyYear),
    province: toFormText(profile.province),
    city: toFormText(profile.city),
    bio: toFormText(profile.bio),
    portfolioUrl: toFormText(profile.portfolioUrl),
  }
}

export function toPayload(
  values: StudentProfileFormValues,
): UpdateStudentProfileInput {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    birthDate: toNullableText(values.birthDate),
    phone: toNullableText(values.phone),
    career: values.career,
    institution: values.institution,
    studyYear: values.studyYear === '' ? null : Number(values.studyYear),
    province: toNullableText(values.province),
    city: toNullableText(values.city),
    bio: toNullableText(values.bio),
    portfolioUrl: toNullableText(values.portfolioUrl),
  }
}
