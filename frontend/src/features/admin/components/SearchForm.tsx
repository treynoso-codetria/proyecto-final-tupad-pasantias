import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'

type SearchFormProps = {
  value: string | undefined
  placeholder: string
  onSearch: (text: string | undefined) => void
}

export function SearchForm({ value, placeholder, onSearch }: SearchFormProps) {
  const { t } = useTranslation('admin')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = new FormData(event.currentTarget).get('q')
    onSearch(typeof text === 'string' ? text.trim() || undefined : undefined)
  }

  return (
    <form role="search" onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <TextField
        // Remounted when the URL changes, so the box shows the current search.
        key={value ?? ''}
        name="q"
        type="search"
        label={t('search.label')}
        placeholder={placeholder}
        defaultValue={value ?? ''}
        className="flex-1"
      />
      <Button type="submit">{t('search.submit')}</Button>
    </form>
  )
}
