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
import { getApiErrorKey } from '@/features/auth/errors'
import { useErrorText } from '@/features/auth/use-error-text'
import { todayIsoDate } from '@/lib/form-schemas'
import { PROVINCES } from '@/lib/provinces'
import { studentKeys, studentsApi, type StudentProfile } from './api'
import { CvCard } from './CvCard'
import {
  STUDY_YEARS,
  studentProfileSchema,
  toFormValues,
  toPayload,
} from './schemas'

export function StudentProfilePage() {
  const { t } = useTranslation('profile')
  const profile = useQuery({
    queryKey: studentKeys.ownProfile,
    queryFn: studentsApi.getOwnProfile,
  })

  return (
    <>
      <PageHeading
        title={t('student.title')}
        description={t('student.description')}
      />
      {profile.isPending && <FullPageLoader fullPage={false} />}
      {profile.isError && <LoadError onRetry={() => void profile.refetch()} />}
      {profile.isSuccess && (
        <div className="space-y-8">
          <CvCard profile={profile.data} />
          <StudentProfileForm profile={profile.data} />
        </div>
      )}
    </>
  )
}

function StudentProfileForm({ profile }: { profile: StudentProfile }) {
  const { t } = useTranslation('profile')
  const errorText = useErrorText()
  const queryClient = useQueryClient()
  const { refreshUser } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(studentProfileSchema),
    // Keeps the form in sync with the stored profile, e.g. after saving.
    values: toFormValues(profile),
  })

  const save = useMutation({
    mutationFn: studentsApi.updateOwnProfile,
    onSuccess: async (saved) => {
      queryClient.setQueryData(studentKeys.ownProfile, saved)
      // The top bar shows the first name, which may have changed.
      await refreshUser().catch(() => undefined)
    },
  })

  return (
    <form
      onSubmit={handleSubmit((values) => save.mutate(toPayload(values)))}
      noValidate
      className="space-y-8"
    >
      <FormSection title={t('student.personal')}>
        <TextField
          label={t('student.firstName')}
          autoComplete="given-name"
          error={errorText(errors.firstName?.message)}
          {...register('firstName')}
        />
        <TextField
          label={t('student.lastName')}
          autoComplete="family-name"
          error={errorText(errors.lastName?.message)}
          {...register('lastName')}
        />
        <TextField
          label={t('student.birthDate')}
          type="date"
          max={todayIsoDate()}
          autoComplete="bday"
          hint={t('student.birthDateHint')}
          error={errorText(errors.birthDate?.message)}
          {...register('birthDate')}
        />
        <TextField
          label={t('student.phone')}
          type="tel"
          autoComplete="tel"
          placeholder={t('student.phonePlaceholder')}
          error={errorText(errors.phone?.message)}
          {...register('phone')}
        />
        <AccountEmailNote email={profile.email} />
      </FormSection>

      <FormSection title={t('student.studies')}>
        <TextField
          label={t('student.career')}
          error={errorText(errors.career?.message)}
          {...register('career')}
        />
        <TextField
          label={t('student.institution')}
          autoComplete="organization"
          error={errorText(errors.institution?.message)}
          {...register('institution')}
        />
        <SelectField
          label={t('student.studyYear')}
          error={errorText(errors.studyYear?.message)}
          {...register('studyYear')}
        >
          <option value="">{t('notSpecified')}</option>
          {STUDY_YEARS.map((year) => (
            <option key={year} value={year}>
              {t('student.studyYearOption', { year })}
            </option>
          ))}
        </SelectField>
      </FormSection>

      <FormSection title={t('student.location')}>
        <SelectField
          label={t('student.province')}
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
          label={t('student.city')}
          autoComplete="address-level2"
          error={errorText(errors.city?.message)}
          {...register('city')}
        />
      </FormSection>

      <FormSection title={t('student.about')}>
        <TextAreaField
          label={t('student.bio')}
          hint={t('student.bioHint')}
          maxLength={2000}
          className="sm:col-span-2"
          error={errorText(errors.bio?.message)}
          {...register('bio')}
        />
        <TextField
          label={t('student.portfolioUrl')}
          type="url"
          autoComplete="url"
          placeholder={t('student.portfolioUrlPlaceholder')}
          className="sm:col-span-2"
          error={errorText(errors.portfolioUrl?.message)}
          {...register('portfolioUrl')}
        />
      </FormSection>

      <SaveBar
        saving={save.isPending}
        pristine={!isDirty}
        saved={save.isSuccess}
        error={save.isError ? errorText(getApiErrorKey(save.error)) : undefined}
      />
    </form>
  )
}
