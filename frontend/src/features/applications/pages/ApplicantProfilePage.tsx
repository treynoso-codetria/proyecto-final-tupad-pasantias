import { useQuery } from '@tanstack/react-query'
import { ExternalLink, FileDown, Mail, Phone } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useParams } from 'react-router'
import { ApiError } from '@/api/client'
import { Alert } from '@/components/ui/Alert'
import { BackLink } from '@/components/ui/BackLink'
import { buttonStyles } from '@/components/ui/button-styles'
import { Card } from '@/components/ui/Card'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { LoadError } from '@/components/ui/LoadError'
import { studentsApi, type StudentProfileView } from '@/features/students/api'

// Passed by the applicants list, so the back link returns to it.
export type ApplicantLinkState = { backTo?: string }

// A student's profile as a company sees it: only for students who applied
// to one of its offers (the API enforces it).
export function ApplicantProfilePage() {
  const { t } = useTranslation('applications')
  const { id = '' } = useParams()
  const state = useLocation().state as ApplicantLinkState | null
  const profile = useQuery({
    queryKey: ['students', 'profile', id],
    queryFn: () => studentsApi.getProfile(id),
  })

  let content
  if (profile.isPending) {
    content = <FullPageLoader fullPage={false} />
  } else if (profile.isError) {
    const status = profile.error instanceof ApiError ? profile.error.status : 0
    content =
      status === 403 ? (
        <Alert>{t('profile.forbidden')}</Alert>
      ) : status === 404 || status === 400 ? (
        <Alert variant="info">{t('profile.notFound')}</Alert>
      ) : (
        <LoadError onRetry={() => void profile.refetch()} />
      )
  } else {
    content = <ProfileView profile={profile.data} />
  }

  return (
    <>
      {state?.backTo && <BackLink to={state.backTo} label={t('profile.back')} />}
      {content}
    </>
  )
}

function ProfileView({ profile }: { profile: StudentProfileView }) {
  const { t } = useTranslation('applications')
  const place = [profile.city, profile.province].filter(Boolean).join(', ')

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl leading-none font-extrabold tracking-tight sm:text-5xl">
          {profile.firstName} {profile.lastName}
        </h1>
        <p className="mt-3 text-lg text-muted">
          {profile.career} · {profile.institution}
        </p>
      </header>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="p-6 sm:p-8">
          <h2 className="font-display text-2xl font-extrabold">{t('profile.about')}</h2>
          <p className="mt-3 whitespace-pre-line">
            {profile.bio ?? <span className="text-muted">{t('profile.noBio')}</span>}
          </p>
          {(profile.portfolioUrl || profile.cvUrl) && (
            <div className="mt-6 flex flex-wrap gap-3">
              {profile.portfolioUrl && (
                <a
                  href={profile.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonStyles('secondary', 'sm')}
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                  {t('profile.portfolio')}
                </a>
              )}
              {profile.cvUrl && (
                <a
                  href={profile.cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonStyles('secondary', 'sm')}
                >
                  <FileDown className="size-4" aria-hidden="true" />
                  {t('profile.cv')}
                </a>
              )}
            </div>
          )}
        </Card>
        <aside className="space-y-6">
          <Card className="p-6">
            <h2 className="font-display text-xl font-extrabold">{t('profile.contact')}</h2>
            <ul className="mt-4 space-y-2 text-sm">
              <ContactItem icon={<Mail className="size-4" aria-hidden="true" />}>
                <a
                  href={`mailto:${profile.email}`}
                  className="font-semibold break-all underline decoration-2 underline-offset-4 hover:bg-accent"
                >
                  {profile.email}
                </a>
              </ContactItem>
              {profile.phone && (
                <ContactItem icon={<Phone className="size-4" aria-hidden="true" />}>
                  <a
                    href={`tel:${profile.phone.replace(/[^\d+]/g, '')}`}
                    className="font-semibold underline decoration-2 underline-offset-4 hover:bg-accent"
                  >
                    {profile.phone}
                  </a>
                </ContactItem>
              )}
              {place && <li className="text-muted">{place}</li>}
            </ul>
          </Card>
          <Card className="p-6">
            <h2 className="font-display text-xl font-extrabold">{t('profile.studies')}</h2>
            <p className="mt-3 text-sm font-semibold">{profile.career}</p>
            <p className="text-sm text-muted">{profile.institution}</p>
            {profile.studyYear !== null && (
              <p className="mt-1 text-sm text-muted">
                {t('applicants.year', { year: profile.studyYear })}
              </p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  )
}

function ContactItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      {icon}
      {children}
    </li>
  )
}
