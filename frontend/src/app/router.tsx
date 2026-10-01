import { createBrowserRouter } from 'react-router'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import type { AuthPanel } from '@/features/auth/components/auth-panel'
import {
  GuestOnly,
  RequireRole,
  RootRedirect,
} from '@/features/auth/components/guards'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterChoicePage } from '@/features/auth/pages/RegisterChoicePage'
import { RegisterEmployerPage } from '@/features/auth/pages/RegisterEmployerPage'
import { RegisterStudentPage } from '@/features/auth/pages/RegisterStudentPage'
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
    element: <GuestOnly />,
    children: [
      {
        element: <AuthLayout />,
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
        ],
      },
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
  { path: '*', element: <NotFoundPage /> },
])
