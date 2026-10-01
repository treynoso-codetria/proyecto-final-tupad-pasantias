import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import {
  buttonStyles,
  type ButtonSize,
  type ButtonVariant,
} from './button-styles'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export function Button({
  variant,
  size,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles(variant, size, className)}
      {...props}
    >
      {loading && (
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  )
}
