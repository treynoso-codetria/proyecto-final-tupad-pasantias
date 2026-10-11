import { apiFetch } from '@/api/client'

export type Company = {
  id: string
  email: string
  name: string
  cuit: string
  industry: string | null
  description: string | null
  website: string | null
  logoUrl: string | null
  phone: string | null
  province: string | null
  city: string | null
  updatedAt: string
}

export type UpdateCompanyInput = Partial<
  Omit<Company, 'id' | 'email' | 'logoUrl' | 'updatedAt'>
>

export const companyKeys = {
  ownCompany: ['companies', 'me'] as const,
}

export const companiesApi = {
  getOwnCompany: () => apiFetch<Company>('/companies/me'),

  updateOwnCompany: (input: UpdateCompanyInput) =>
    apiFetch<Company>('/companies/me', { method: 'PATCH', body: input }),
}
