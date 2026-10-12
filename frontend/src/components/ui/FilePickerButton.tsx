import { useRef, type ReactNode } from 'react'
import { Button } from './Button'
import type { ButtonVariant } from './button-styles'

type FilePickerButtonProps = {
  accept: string
  onSelect: (file: File) => void
  loading?: boolean
  variant?: ButtonVariant
  children: ReactNode
}

// A button that opens the system's file picker (the native input stays
// hidden, it cannot be styled).
export function FilePickerButton({
  accept,
  onSelect,
  loading,
  variant,
  children,
}: FilePickerButtonProps) {
  const input = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          // Cleared so that choosing the same file again fires a change.
          event.target.value = ''
          if (file) {
            onSelect(file)
          }
        }}
      />
      <Button
        size="sm"
        variant={variant}
        loading={loading}
        onClick={() => input.current?.click()}
      >
        {children}
      </Button>
    </>
  )
}
