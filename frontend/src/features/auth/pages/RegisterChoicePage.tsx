import {
  ArrowRight,
  Building2,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { Role } from '../types'

type Choice = {
  role: Role
  to: string
  icon: LucideIcon
  // Key of its texts under `register.choice` in the `auth` translations.
  content: 'student' | 'employer'
}

const CHOICES: Choice[] = [
  {
    role: 'STUDENT',
    to: '/register/student',
    icon: GraduationCap,
    content: 'student',
  },
  {
    role: 'EMPLOYER',
    to: '/register/employer',
    icon: Building2,
    content: 'employer',
  },
]

// First step of registration: the account type decides which form follows
// and which color the rest of the app will have for this user.
export function RegisterChoicePage() {
  const { t } = useTranslation('auth')

  return (
    <div>
      <h1 className="font-display text-4xl font-extrabold tracking-tight">
        {t('register.choice.title')}
      </h1>
      <p className="mt-2 text-muted">{t('register.choice.subtitle')}</p>

      <ul className="mt-7 space-y-5">
        {CHOICES.map(({ role, to, icon: Icon, content }) => (
          <li key={role} data-role={role}>
            <Link
              to={to}
              className="group flex items-center gap-4 rounded-2xl border-2 border-ink bg-surface p-5 shadow-hard transition-[translate,box-shadow,background-color] duration-100 hover:-translate-0.5 hover:bg-accent-soft hover:shadow-[6px_6px_0_0_var(--color-ink)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ink active:translate-1 active:shadow-none motion-reduce:transition-none"
            >
              <span className="grid size-14 shrink-0 -rotate-3 place-items-center rounded-xl border-2 border-ink bg-accent shadow-hard-sm">
                <Icon className="size-7" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-xl font-extrabold">
                  {t(`register.choice.${content}.title`)}
                </span>
                <span className="block text-sm text-muted">
                  {t(`register.choice.${content}.description`)}
                </span>
              </span>
              <ArrowRight
                className="size-6 shrink-0 transition-transform duration-100 group-hover:translate-x-1 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-center text-sm">
        {t('register.haveAccount')}{' '}
        <Link
          to="/login"
          className="font-bold underline decoration-2 underline-offset-4 hover:bg-accent"
        >
          {t('register.loginLink')}
        </Link>
      </p>
    </div>
  )
}
