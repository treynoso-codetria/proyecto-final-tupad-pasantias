import { apiFetch } from '@/api/client'

export type StudentProfile = {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  // YYYY-MM-DD
  birthDate: string | null
  career: string
  institution: string
  studyYear: number | null
  province: string | null
  city: string | null
  bio: string | null
  portfolioUrl: string | null
  cvUrl: string | null
  cvFileName: string | null
  updatedAt: string
}

export type UpdateStudentProfileInput = Partial<
  Omit<
    StudentProfile,
    'id' | 'email' | 'cvUrl' | 'cvFileName' | 'updatedAt'
  >
>

export const studentKeys = {
  ownProfile: ['students', 'me'] as const,
}

export const studentsApi = {
  getOwnProfile: () => apiFetch<StudentProfile>('/students/me'),

  updateOwnProfile: (input: UpdateStudentProfileInput) =>
    apiFetch<StudentProfile>('/students/me', { method: 'PATCH', body: input }),
}
