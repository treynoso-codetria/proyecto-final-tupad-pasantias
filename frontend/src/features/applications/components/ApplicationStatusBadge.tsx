import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'
import type { ApplicationStatus } from '../api'

const TONE = {
  PENDING: 'accent',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  WITHDRAWN: 'muted',
} as const

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const { t } = useTranslation('applications')
  return <Badge tone={TONE[status]}>{t(`status.${status}`)}</Badge>
}
