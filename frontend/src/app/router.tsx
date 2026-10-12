import { createBrowserRouter } from 'react-router'
import { AccountPage } from '@/features/account/AccountPage'
import { ConfirmEmailChangePage } from '@/features/account/ConfirmEmailChangePage'
import { ApplicantProfilePage } from '@/features/applications/pages/ApplicantProfilePage'
import { ApplicantsPage } from '@/features/applications/pages/ApplicantsPage'
import { MyApplicationsPage } from '@/features/applications/pages/MyApplicationsPage'
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
import { CatalogAdminPage } from '@/features/catalog/CatalogAdminPage'
import { CompanyProfilePage } from '@/features/companies/CompanyProfilePage'
import { PublicCompanyPage } from '@/features/companies/PublicCompanyPage'
import { AdminHomePage } from '@/features/home/AdminHomePage'
import { EmployerHomePage } from '@/features/home/EmployerHomePage'
import { StudentHomePage } from '@/features/home/StudentHomePage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { MyOffersPage } from '@/features/offers/pages/MyOffersPage'
import { OfferDetailPage } from '@/features/offers/pages/OfferDetailPage'
import {
  EditOfferPage,
  NewOfferPage,
} from '@/features/offers/pages/OfferFormPage'
import { OffersPage } from '@/features/offers/pages/OffersPage'
import { StudentProfilePage } from '@/features/students/StudentProfilePage'
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
        children: [
          { index: true, element: <StudentHomePage /> },
          { path: 'profile', element: <StudentProfilePage /> },
          { path: 'applications', element: <MyApplicationsPage /> },
        ],
      },
    ],
  },
  {
    element: <RequireRole role="EMPLOYER" />,
    children: [
      {
        path: '/employer',
        element: <AppShell />,
        children: [
          { index: true, element: <EmployerHomePage /> },
          { path: 'company', element: <CompanyProfilePage /> },
          { path: 'offers', element: <MyOffersPage /> },
          { path: 'offers/new', element: <NewOfferPage /> },
          { path: 'offers/:id/edit', element: <EditOfferPage /> },
          { path: 'offers/:id/applications', element: <ApplicantsPage /> },
          { path: 'students/:id', element: <ApplicantProfilePage /> },
        ],
      },
    ],
  },
  {
    element: <RequireRole role="ADMIN" />,
    children: [
      {
        path: '/admin',
        element: <AppShell />,
        children: [
          { index: true, element: <AdminHomePage /> },
          { path: 'catalog', element: <CatalogAdminPage /> },
        ],
      },
    ],
  },
  // Public pages: anyone can browse the offers and the companies.
  {
    element: <AppShell />,
    children: [
      { path: '/offers', element: <OffersPage /> },
      { path: '/offers/:id', element: <OfferDetailPage /> },
      { path: '/companies/:id', element: <PublicCompanyPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/account', element: <AccountPage /> },
          { path: '/notifications', element: <NotificationsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
