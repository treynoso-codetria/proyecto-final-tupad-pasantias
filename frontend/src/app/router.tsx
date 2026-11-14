import { createBrowserRouter } from 'react-router'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import type { AuthPanel } from '@/features/auth/components/auth-panel'
import {
  GuestOnly,
  RequireAuth,
  RequireRole,
  RootRedirect,
} from '@/features/auth/components/guards'
import { AppShell } from './AppShell'
import { page } from './lazy-page'
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
          {
            path: '/login',
            element: page(
              () => import('@/features/auth/pages/LoginPage'),
              'LoginPage',
            ),
          },
          {
            path: '/register',
            element: page(
              () => import('@/features/auth/pages/RegisterChoicePage'),
              'RegisterChoicePage',
            ),
          },
          {
            path: '/register/student',
            element: page(
              () => import('@/features/auth/pages/RegisterStudentPage'),
              'RegisterStudentPage',
            ),
            handle: studentPanel,
          },
          {
            path: '/register/employer',
            element: page(
              () => import('@/features/auth/pages/RegisterEmployerPage'),
              'RegisterEmployerPage',
            ),
            handle: employerPanel,
          },
          {
            path: '/check-email',
            element: page(
              () => import('@/features/auth/pages/CheckEmailPage'),
              'CheckEmailPage',
            ),
          },
        ],
      },
      // Opened from emailed links; they work with or without a session.
      {
        path: '/verify-email',
        element: page(
          () => import('@/features/auth/pages/VerifyEmailPage'),
          'VerifyEmailPage',
        ),
      },
      {
        path: '/confirm-email-change',
        element: page(
          () => import('@/features/account/ConfirmEmailChangePage'),
          'ConfirmEmailChangePage',
        ),
      },
    ],
  },
  {
    element: <RequireRole role="STUDENT" />,
    children: [
      {
        path: '/student',
        element: <AppShell />,
        children: [
          {
            index: true,
            element: page(
              () => import('@/features/home/StudentHomePage'),
              'StudentHomePage',
            ),
          },
          {
            path: 'profile',
            element: page(
              () => import('@/features/students/StudentProfilePage'),
              'StudentProfilePage',
            ),
          },
          {
            path: 'applications',
            element: page(
              () => import('@/features/applications/pages/MyApplicationsPage'),
              'MyApplicationsPage',
            ),
          },
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
          {
            index: true,
            element: page(
              () => import('@/features/home/EmployerHomePage'),
              'EmployerHomePage',
            ),
          },
          {
            path: 'company',
            element: page(
              () => import('@/features/companies/CompanyProfilePage'),
              'CompanyProfilePage',
            ),
          },
          {
            path: 'offers',
            element: page(
              () => import('@/features/offers/pages/MyOffersPage'),
              'MyOffersPage',
            ),
          },
          {
            path: 'offers/new',
            element: page(
              () => import('@/features/offers/pages/OfferFormPage'),
              'NewOfferPage',
            ),
          },
          {
            path: 'offers/:id/edit',
            element: page(
              () => import('@/features/offers/pages/OfferFormPage'),
              'EditOfferPage',
            ),
          },
          {
            path: 'offers/:id/applications',
            element: page(
              () => import('@/features/applications/pages/ApplicantsPage'),
              'ApplicantsPage',
            ),
          },
          {
            path: 'students/:id',
            element: page(
              () =>
                import('@/features/applications/pages/ApplicantProfilePage'),
              'ApplicantProfilePage',
            ),
          },
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
          {
            index: true,
            element: page(
              () => import('@/features/home/AdminHomePage'),
              'AdminHomePage',
            ),
          },
          {
            path: 'users',
            element: page(
              () => import('@/features/admin/UsersAdminPage'),
              'UsersAdminPage',
            ),
          },
          {
            path: 'students/:id',
            element: page(
              () =>
                import('@/features/applications/pages/ApplicantProfilePage'),
              'ApplicantProfilePage',
            ),
          },
          {
            path: 'offers',
            element: page(
              () => import('@/features/admin/OffersAdminPage'),
              'OffersAdminPage',
            ),
          },
          {
            path: 'catalog',
            element: page(
              () => import('@/features/catalog/CatalogAdminPage'),
              'CatalogAdminPage',
            ),
          },
          {
            path: 'activity',
            element: page(
              () => import('@/features/admin/ActivityAdminPage'),
              'ActivityAdminPage',
            ),
          },
        ],
      },
    ],
  },
  // Conversations about an application, between the student and the company.
  {
    element: <RequireRole role={['STUDENT', 'EMPLOYER']} />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: '/messages',
            element: page(
              () => import('@/features/messages/MessagesPage'),
              'MessagesPage',
            ),
          },
          {
            path: '/messages/:applicationId',
            element: page(
              () => import('@/features/messages/ConversationPage'),
              'ConversationPage',
            ),
          },
        ],
      },
    ],
  },
  // Public pages: anyone can browse the offers and the companies.
  {
    element: <AppShell />,
    children: [
      {
        path: '/offers',
        element: page(
          () => import('@/features/offers/pages/OffersPage'),
          'OffersPage',
        ),
      },
      {
        path: '/offers/:id',
        element: page(
          () => import('@/features/offers/pages/OfferDetailPage'),
          'OfferDetailPage',
        ),
      },
      {
        path: '/companies/:id',
        element: page(
          () => import('@/features/companies/PublicCompanyPage'),
          'PublicCompanyPage',
        ),
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: '/account',
            element: page(
              () => import('@/features/account/AccountPage'),
              'AccountPage',
            ),
          },
          {
            path: '/notifications',
            element: page(
              () => import('@/features/notifications/NotificationsPage'),
              'NotificationsPage',
            ),
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
