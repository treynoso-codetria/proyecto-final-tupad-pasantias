import type { Role } from '../types'

// Which content the colored side panel of the auth screens shows. Each auth
// route declares its own through the route `handle` (see app/router.tsx); the
// texts are under `panel.<content>` in the `auth` translations.
export type AuthPanel = {
  // Tints the panel with the role color; omitted = neutral brand color.
  role?: Role
  content: 'default' | 'student' | 'employer'
}

export const DEFAULT_AUTH_PANEL: AuthPanel = { content: 'default' }
