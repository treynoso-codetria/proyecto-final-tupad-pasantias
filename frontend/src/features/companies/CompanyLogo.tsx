import { useState } from 'react'
import { cn } from '@/lib/cn'

type CompanyLogoProps = {
  company: { name: string; logoUrl: string | null }
  size?: 'xs' | 'md' | 'lg'
}

const sizes = {
  xs: 'size-6 rounded-md text-xs',
  md: 'size-14 rounded-xl text-2xl',
  lg: 'size-20 rounded-2xl text-4xl',
}

// The logo of a company, or its initial while it has none (or the image
// fails to load). Decorative: the company name is always next to it.
export function CompanyLogo({ company, size = 'md' }: CompanyLogoProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const box = cn(
    'shrink-0 overflow-hidden border-2 border-ink bg-surface',
    sizes[size],
  )

  if (company.logoUrl && failedUrl !== company.logoUrl) {
    return (
      <img
        src={company.logoUrl}
        alt=""
        loading="lazy"
        onError={() => setFailedUrl(company.logoUrl)}
        className={cn(box, 'bg-white object-contain p-0.5')}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        box,
        'flex items-center justify-center bg-accent-soft font-display font-extrabold',
      )}
    >
      {company.name.trim().charAt(0).toUpperCase()}
    </span>
  )
}
