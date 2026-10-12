import { apiFetch } from '@/api/client'
import { toFormData } from '@/lib/uploads'

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
  // Temporary link (it works for at least an hour).
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

// What a company sees of a student who applied to one of its offers.
export type StudentProfileView = Omit<StudentProfile, 'birthDate'>

export const studentKeys = {
  ownProfile: ['students', 'me'] as const,
}

export const studentsApi = {
  getOwnProfile: () => apiFetch<StudentProfile>('/students/me'),

  // Only for a company the student applied to, or an administrator.
  getProfile: (id: string) => apiFetch<StudentProfileView>(`/students/${id}`),

  updateOwnProfile: (input: UpdateStudentProfileInput) =>
    apiFetch<StudentProfile>('/students/me', { method: 'PATCH', body: input }),

  // Uploads a PDF, replacing the current CV.
  uploadCv: (file: File) =>
    apiFetch<StudentProfile>('/students/me/cv', {
      method: 'PUT',
      body: toFormData(file),
    }),

  deleteCv: () =>
    apiFetch<StudentProfile>('/students/me/cv', { method: 'DELETE' }),
}
