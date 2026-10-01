// Mirrors the backend contracts of /api/auth (see Swagger at /api/docs).

export type Role = 'STUDENT' | 'EMPLOYER' | 'ADMIN'

export type AuthResponse = {
  accessToken: string
  user: { id: string; email: string; role: Role }
}

export type CurrentUser = {
  id: string
  email: string
  role: Role
  lastLoginAt: string | null
  createdAt: string
  studentProfile: { id: string; firstName: string; lastName: string } | null
  company: { id: string; name: string } | null
}

export type LoginInput = {
  email: string
  password: string
}

export type RegisterStudentInput = LoginInput & {
  firstName: string
  lastName: string
  career: string
  institution: string
}

export type RegisterEmployerInput = LoginInput & {
  companyName: string
  cuit: string
}
