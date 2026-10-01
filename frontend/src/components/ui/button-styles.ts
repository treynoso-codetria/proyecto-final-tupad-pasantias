import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary'
export type ButtonSize = 'md' | 'sm'

const base =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-ink ' +
  'font-display font-bold text-ink transition-[translate,box-shadow] duration-100 ' +
  'focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ink ' +
  'disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none'

// The button lifts on hover and is "pressed" into its shadow when clicked.
const sizes: Record<ButtonSize, string> = {
  md:
    'px-5 py-3 text-base shadow-hard ' +
    'not-disabled:hover:-translate-0.5 not-disabled:hover:shadow-[6px_6px_0_0_var(--color-ink)] ' +
    'not-disabled:active:translate-1 not-disabled:active:shadow-none',
  sm:
    'px-3 py-1.5 text-sm shadow-hard-sm ' +
    'not-disabled:hover:-translate-px not-disabled:hover:shadow-[3px_3px_0_0_var(--color-ink)] ' +
    'not-disabled:active:translate-0.5 not-disabled:active:shadow-none',
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent',
  secondary: 'bg-surface',
}

export function buttonStyles(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(base, sizes[size], variants[variant], className)
}
