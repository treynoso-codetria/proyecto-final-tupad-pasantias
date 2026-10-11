import { apiFetch } from '@/api/client'
import type { OfferStatus, OfferType, WorkModality } from '@/features/offers/api'

export const APPLICATION_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

// Companies never see withdrawn applications.
export const APPLICANT_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED'] as const
export type ApplicantStatus = (typeof APPLICANT_STATUSES)[number]
export type Decision = 'ACCEPTED' | 'REJECTED'

export const COVER_LETTER_MAX = 2000

export type Application = {
  id: string
  offerId: string
  status: ApplicationStatus
  coverLetter: string | null
  cvUrl: string | null
  appliedAt: string
  reviewedAt: string | null
}

export type MyApplication = Application & {
  offer: {
    id: string
    title: string
    status: OfferStatus
    type: OfferType
    modality: WorkModality
    province: string | null
    city: string | null
    company: { id: string; name: string }
  }
}

export type Applicant = Application & {
  student: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
    career: string
    institution: string
    studyYear: number | null
    province: string | null
    city: string | null
  }
}

export const applicationKeys = {
  all: ['applications'] as const,
  mine: (status?: ApplicationStatus) =>
    ['applications', 'mine', status ?? 'all'] as const,
  applicants: (offerId: string, status?: ApplicantStatus) =>
    ['applications', 'offer', offerId, status ?? 'all'] as const,
}

export const applicationsApi = {
  apply: (offerId: string, coverLetter: string | null) =>
    apiFetch<Application>(`/offers/${offerId}/applications`, {
      method: 'POST',
      body: { coverLetter },
    }),

  mine: (status?: ApplicationStatus) =>
    apiFetch<MyApplication[]>(
      `/applications/mine${status ? `?status=${status}` : ''}`,
    ),

  withdraw: (id: string) =>
    apiFetch<Application>(`/applications/${id}/withdraw`, { method: 'POST' }),

  applicants: (offerId: string, status?: ApplicantStatus) =>
    apiFetch<Applicant[]>(
      `/offers/${offerId}/applications${status ? `?status=${status}` : ''}`,
    ),

  decide: (id: string, status: Decision) =>
    apiFetch<Application>(`/applications/${id}/status`, {
      method: 'PATCH',
      body: { status },
    }),
}
