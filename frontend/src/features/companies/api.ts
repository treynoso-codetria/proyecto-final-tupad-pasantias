import { apiFetch } from '@/api/client'
import { toFormData } from '@/lib/uploads'

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

export type PublicCompany = {
  id: string
  name: string
  industry: string | null
  description: string | null
  website: string | null
  logoUrl: string | null
  province: string | null
  city: string | null
  openOffers: {
    id: string
    title: string
    type: 'INTERNSHIP' | 'JOB'
    modality: 'ON_SITE' | 'REMOTE' | 'HYBRID'
    workload: 'FULL_TIME' | 'PART_TIME'
    province: string | null
    city: string | null
    publishedAt: string
    deadline: string | null
  }[]
}

export const companyKeys = {
  ownCompany: ['companies', 'me'] as const,
  allPublic: ['companies', 'public'] as const,
  public: (id: string) => ['companies', 'public', id] as const,
}

export const companiesApi = {
  getOwnCompany: () => apiFetch<Company>('/companies/me'),

  getPublic: (id: string) => apiFetch<PublicCompany>(`/companies/${id}`),

  updateOwnCompany: (input: UpdateCompanyInput) =>
    apiFetch<Company>('/companies/me', { method: 'PATCH', body: input }),

  // Uploads an image, replacing the current logo.
  uploadLogo: (file: File) =>
    apiFetch<Company>('/companies/me/logo', {
      method: 'PUT',
      body: toFormData(file),
    }),

  deleteLogo: () =>
    apiFetch<Company>('/companies/me/logo', { method: 'DELETE' }),
}
