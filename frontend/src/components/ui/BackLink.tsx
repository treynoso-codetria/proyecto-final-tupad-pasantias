import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold underline decoration-2 underline-offset-4 hover:bg-accent"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {label}
    </Link>
  )
}
