import { z } from 'zod'
import { key, requiredText } from '@/features/auth/schemas'
import { optionalPhone, optionalText, optionalUrl } from '@/lib/form-schemas'
import { toFormText, toNullableText } from '@/lib/form-values'
import type { Company, UpdateCompanyInput } from './api'

export const companySchema = z.object({
  name: requiredText(150),
  cuit: z.string().regex(/^\d{2}-\d{8}-\d$/, key('validation.cuitInvalid')),
  industry: optionalText(100),
  description: optionalText(2000),
  website: optionalUrl,
  phone: optionalPhone,
  // Value of a <select>; '' = not specified.
  province: z.string(),
  city: optionalText(100),
})

export type CompanyFormValues = z.infer<typeof companySchema>

export function toFormValues(company: Company): CompanyFormValues {
  return {
    name: company.name,
    cuit: company.cuit,
    industry: toFormText(company.industry),
    description: toFormText(company.description),
    website: toFormText(company.website),
    phone: toFormText(company.phone),
    province: toFormText(company.province),
    city: toFormText(company.city),
  }
}

export function toPayload(values: CompanyFormValues): UpdateCompanyInput {
  return {
    name: values.name,
    cuit: values.cuit,
    industry: toNullableText(values.industry),
    description: toNullableText(values.description),
    website: toNullableText(values.website),
    phone: toNullableText(values.phone),
    province: toNullableText(values.province),
    city: toNullableText(values.city),
  }
}
