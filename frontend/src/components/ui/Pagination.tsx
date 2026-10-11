import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'

type PaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const { t } = useTranslation('offers')
  if (totalPages <= 1) {
    return null
  }

  return (
    <nav
      aria-label={t('pagination.label')}
      className="flex items-center justify-between gap-4"
    >
      <Button
        variant="secondary"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        {t('pagination.previous')}
      </Button>
      <p className="text-sm font-semibold" aria-live="polite">
        {t('pagination.page', { page, total: totalPages })}
      </p>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        {t('pagination.next')}
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>
    </nav>
  )
}
