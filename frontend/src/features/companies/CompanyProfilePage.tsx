import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { AccountEmailNote } from '@/components/ui/AccountEmailNote'
import { FormSection } from '@/components/ui/FormSection'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { LoadError } from '@/components/ui/LoadError'
import { PageHeading } from '@/components/ui/PageHeading'
import { SaveBar } from '@/components/ui/SaveBar'
import { SelectField } from '@/components/ui/SelectField'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { TextField } from '@/components/ui/TextField'
import { useAuth } from '@/features/auth/auth-context'
import { getApiErrorKey, getErrorField } from '@/features/auth/errors'
import { formatCuit } from '@/features/auth/schemas'
import { useErrorText } from '@/features/auth/use-error-text'
import { PROVINCES } from '@/lib/provinces'
import { companiesApi, companyKeys, type Company } from './api'
import { LogoCard } from './LogoCard'
import { companySchema, toFormValues, toPayload } from './schemas'

export function CompanyProfilePage() {
  const { t } = useTranslation('profile')
  const company = useQuery({
    queryKey: companyKeys.ownCompany,
    queryFn: companiesApi.getOwnCompany,
  })

  return (
    <>
      <PageHeading
        title={t('company.title')}
        description={t('company.description')}
      />
      {company.isPending && <FullPageLoader fullPage={false} />}
      {company.isError && <LoadError onRetry={() => void company.refetch()} />}
      {company.isSuccess && (
        <div className="space-y-8">
          <LogoCard company={company.data} />
          <CompanyForm company={company.data} />
        </div>
      )}
    </>
  )
}

function CompanyForm({ company }: { company: Company }) {
  const { t } = useTranslation('profile')
  const errorText = useErrorText()
  const queryClient = useQueryClient()
  const { refreshUser } = useAuth()

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(companySchema),
    // Keeps the form in sync with the stored company, e.g. after saving.
    values: toFormValues(company),
  })

  const save = useMutation({
    mutationFn: companiesApi.updateOwnCompany,
    onSuccess: async (saved) => {
      queryClient.setQueryData(companyKeys.ownCompany, saved)
      // The top bar shows the company name, which may have changed.
      await refreshUser().catch(() => undefined)
    },
    onError: (error) => {
      // A CUIT that belongs to another company is shown on its field.
      const field = getErrorField(error, { CUIT_TAKEN: 'cuit' })
      if (field) {
        setError(
          field,
          { message: getApiErrorKey(error) },
          { shouldFocus: true },
        )
      }
    },
  })
  const cuitTaken = getErrorField(save.error, { CUIT_TAKEN: 'cuit' })

  return (
    <form
      onSubmit={handleSubmit((values) => save.mutate(toPayload(values)))}
      noValidate
      className="space-y-8"
    >
      <FormSection title={t('company.data')}>
        <TextField
          label={t('company.name')}
          autoComplete="organization"
          error={errorText(errors.name?.message)}
          {...register('name')}
        />
        <TextField
          label={t('company.cuit')}
          inputMode="numeric"
          placeholder="30-12345678-9"
          hint={t('company.cuitHint')}
          error={errorText(errors.cuit?.message)}
          {...register('cuit', {
            onChange: (event: { target: { value: string } }) =>
              setValue('cuit', formatCuit(event.target.value), {
                shouldDirty: true,
              }),
          })}
        />
        <TextField
          label={t('company.industry')}
          placeholder={t('company.industryPlaceholder')}
          error={errorText(errors.industry?.message)}
          {...register('industry')}
        />
        <AccountEmailNote email={company.email} />
      </FormSection>

      <FormSection title={t('company.about')}>
        <TextAreaField
          label={t('company.companyDescription')}
          hint={t('company.companyDescriptionHint')}
          maxLength={2000}
          className="sm:col-span-2"
          error={errorText(errors.description?.message)}
          {...register('description')}
        />
        <TextField
          label={t('company.website')}
          type="url"
          autoComplete="url"
          placeholder={t('company.websitePlaceholder')}
          className="sm:col-span-2"
          error={errorText(errors.website?.message)}
          {...register('website')}
        />
      </FormSection>

      <FormSection title={t('company.contact')}>
        <TextField
          label={t('company.phone')}
          type="tel"
          autoComplete="tel"
          placeholder={t('company.phonePlaceholder')}
          className="sm:col-span-2"
          error={errorText(errors.phone?.message)}
          {...register('phone')}
        />
        <SelectField
          label={t('company.province')}
          autoComplete="address-level1"
          error={errorText(errors.province?.message)}
          {...register('province')}
        >
          <option value="">{t('notSpecified')}</option>
          {PROVINCES.map((province) => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </SelectField>
        <TextField
          label={t('company.city')}
          autoComplete="address-level2"
          error={errorText(errors.city?.message)}
          {...register('city')}
        />
      </FormSection>

      <SaveBar
        saving={save.isPending}
        pristine={!isDirty}
        saved={save.isSuccess}
        error={
          save.isError && !cuitTaken
            ? errorText(getApiErrorKey(save.error))
            : undefined
        }
      />
    </form>
  )
}
