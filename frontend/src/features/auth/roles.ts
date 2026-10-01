import type { CurrentUser, Role } from './types'

// The label of each role is a translation: t(`roles.${role}`) in `common`.
export const ROLE_HOME_PATH: Record<Role, string> = {
  STUDENT: '/student',
  EMPLOYER: '/employer',
  ADMIN: '/admin',
}

// Name shown in greetings and in the top bar.
export function getDisplayName(user: CurrentUser): string {
  if (user.studentProfile) {
    return user.studentProfile.firstName
  }
  if (user.company) {
    return user.company.name
  }
  return user.email
}
