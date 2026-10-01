import { Eye, EyeOff } from 'lucide-react'
import { forwardRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TextField, type TextFieldProps } from './TextField'

type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'trailing'>

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField(props, ref) {
    const { t } = useTranslation()
    const [visible, setVisible] = useState(false)
    const Icon = visible ? EyeOff : Eye

    return (
      <TextField
        ref={ref}
        type={visible ? 'text' : 'password'}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? t('password.hide') : t('password.show')}
            aria-pressed={visible}
            className="cursor-pointer rounded-lg p-1.5 hover:bg-ink/10 focus-visible:outline-2 focus-visible:outline-ink"
          >
            <Icon className="size-5" aria-hidden="true" />
          </button>
        }
        {...props}
      />
    )
  },
)
