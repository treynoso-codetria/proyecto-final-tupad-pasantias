import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'

// Profiles show the account's email but do not edit it: changing it needs
// the confirmation flow of the account screen.
export function AccountEmailNote({ email }: { email: string }) {
  const { t } = useTranslation('profile')

  return (
    <p className="break-words text-sm text-muted sm:col-span-2">
      <Trans
        t={t}
        i18nKey="accountEmail"
        values={{ email }}
        components={{
          strong: <strong className="text-ink" />,
          // Not named `link`: that is a void HTML tag and would lose its text.
          accountLink: (
            <Link
              to="/account"
              className="font-bold text-ink underline decoration-2 underline-offset-4 hover:bg-accent"
            />
          ),
        }}
      />
    </p>
  )
}
