import { createBrowserRouter } from 'react-router'
import { AccountPage } from '@/features/account/AccountPage'
import { ConfirmEmailChangePage } from '@/features/account/ConfirmEmailChangePage'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import type { AuthPanel } from '@/features/auth/components/auth-panel'
import {
  GuestOnly,
  RequireAuth,
  RequireRole,
  RootRedirect,
} from '@/features/auth/components/guards'
import { CheckEmailPage } from '@/features/auth/pages/CheckEmailPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterChoicePage } from '@/features/auth/pages/RegisterChoicePage'
import { RegisterEmployerPage } from '@/features/auth/pages/RegisterEmployerPage'
import { RegisterStudentPage } from '@/features/auth/pages/RegisterStudentPage'
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage'
import { AdminHomePage } from '@/features/home/AdminHomePage'
import { EmployerHomePage } from '@/features/home/EmployerHomePage'
import { StudentHomePage } from '@/features/home/StudentHomePage'
import { AppShell } from './AppShell'
import { NotFoundPage } from './NotFoundPage'

const studentPanel: AuthPanel = { role: 'STUDENT', content: 'student' }
const employerPanel: AuthPanel = { role: 'EMPLOYER', content: 'employer' }

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  {
    element: <AuthLayout />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterChoicePage /> },
          {
            path: '/register/student',
            element: <RegisterStudentPage />,
            handle: studentPanel,
          },
          {
            path: '/register/employer',
            element: <RegisterEmployerPage />,
            handle: employerPanel,
          },
          { path: '/check-email', element: <CheckEmailPage /> },
        ],
      },
      // Opened from emailed links; they work with or without a session.
      { path: '/verify-email', element: <VerifyEmailPage /> },
      { path: '/confirm-email-change', element: <ConfirmEmailChangePage /> },
    ],
  },
  {
    element: <RequireRole role="STUDENT" />,
    children: [
      {
        path: '/student',
        element: <AppShell />,
        children: [{ index: true, element: <StudentHomePage /> }],
      },
    ],
  },
  {
    element: <RequireRole role="EMPLOYER" />,
    children: [
      {
        path: '/employer',
        element: <AppShell />,
        children: [{ index: true, element: <EmployerHomePage /> }],
      },
    ],
  },
  {
    element: <RequireRole role="ADMIN" />,
    children: [
      {
        path: '/admin',
        element: <AppShell />,
        children: [{ index: true, element: <AdminHomePage /> }],
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [{ path: '/account', element: <AccountPage /> }],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
