import { Navigate, Outlet, useLocation } from 'react-router'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { useAuth } from '../auth-context'
import { ROLE_HOME_PATH } from '../roles'
import type { Role } from '../types'

// Wraps login/registration: a signed-in user is sent to their own home. This
// is also what moves the user forward right after a successful login.
//
// A screen that sends the user to log in can pass `state={{ from: path }}` to
// bring them back there afterwards (only paths within the app).
export function GuestOnly() {
  const auth = useAuth()
  const from = (useLocation().state as { from?: unknown } | null)?.from

  if (auth.status === 'loading') {
    return <FullPageLoader fullPage={false} />
  }
  if (auth.status === 'authenticated') {
    const target =
      typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
        ? from
        : ROLE_HOME_PATH[auth.user.role]
    return <Navigate to={target} replace />
  }
  return <Outlet />
}

// Wraps screens that any signed-in user can open, whatever their role.
export function RequireAuth() {
  const auth = useAuth()

  if (auth.status === 'loading') {
    return <FullPageLoader />
  }
  if (auth.status === 'anonymous') {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

// Wraps the private area of one role (or of several). The API enforces the
// same rule; this only keeps users from landing on screens that are not
// theirs.
export function RequireRole({ role }: { role: Role | readonly Role[] }) {
  const auth = useAuth()

  if (auth.status === 'loading') {
    return <FullPageLoader />
  }
  if (auth.status === 'anonymous') {
    return <Navigate to="/login" replace />
  }
  const allowed: readonly Role[] = typeof role === 'string' ? [role] : role
  if (!allowed.includes(auth.user.role)) {
    return <Navigate to={ROLE_HOME_PATH[auth.user.role]} replace />
  }
  return <Outlet />
}

// "/" has no content of its own yet: it forwards to the home or to the login.
export function RootRedirect() {
  const auth = useAuth()

  if (auth.status === 'loading') {
    return <FullPageLoader />
  }
  if (auth.status === 'authenticated') {
    return <Navigate to={ROLE_HOME_PATH[auth.user.role]} replace />
  }
  return <Navigate to="/login" replace />
}
