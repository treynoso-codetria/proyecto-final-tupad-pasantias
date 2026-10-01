import { Navigate, Outlet } from 'react-router'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { useAuth } from '../auth-context'
import { ROLE_HOME_PATH } from '../roles'
import type { Role } from '../types'

// Wraps login/registration: a signed-in user is sent to their own home. This
// is also what moves the user forward right after a successful login.
export function GuestOnly() {
  const auth = useAuth()

  if (auth.status === 'loading') {
    return <FullPageLoader />
  }
  if (auth.status === 'authenticated') {
    return <Navigate to={ROLE_HOME_PATH[auth.user.role]} replace />
  }
  return <Outlet />
}

// Wraps the private area of one role. The API enforces the same rule; this
// only keeps users from landing on screens that are not theirs.
export function RequireRole({ role }: { role: Role }) {
  const auth = useAuth()

  if (auth.status === 'loading') {
    return <FullPageLoader />
  }
  if (auth.status === 'anonymous') {
    return <Navigate to="/login" replace />
  }
  if (auth.user.role !== role) {
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
