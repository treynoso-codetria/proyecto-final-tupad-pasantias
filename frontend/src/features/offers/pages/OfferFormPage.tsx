import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useId } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { Alert } from '@/components/ui/Alert'
import { BackLink } from '@/components/ui/BackLink'
import { Button } from '@/components/ui/Button'
import { buttonStyles } from '@/components/ui/button-styles'
import { FormSection } from '@/components/ui/FormSection'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { LoadError } from '@/components/ui/LoadError'
import { PageHeading } from '@/components/ui/PageHeading'
import { SelectField } from '@/components/ui/SelectField'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { TextField } from '@/components/ui/TextField'
import { useAuth } from '@/features/auth/auth-context'
import { getApiErrorKey, getErrorField } from '@/features/auth/errors'
import { useErrorText } from '@/features/auth/use-error-text'
import { useCategories, useTags } from '@/features/catalog/api'
import { todayIsoDate } from '@/lib/form-schemas'
import { PROVINCES } from '@/lib/provinces'
import {
  MAX_OFFER_TAGS,
  OFFER_TYPES,
  offerKeys,
  offersApi,
  WORK_MODALITIES,
  WORKLOADS,
  type OfferDetail,
} from '../api'
import { TagToggleList } from '../components/TagToggleList'
import type { OfferLinkState } from '../link-state'
import {
  EMPTY_OFFER_FORM,
  offerFormSchema,
  toFormValues,
  toPayload,
  type OfferFormValues,
} from '../schemas'

const MY_OFFERS = '/employer/offers'

// API errors that are about one field of the form.
const FIELD_BY_ERROR = {
  CATEGORY_NOT_AVAILABLE: 'categoryId',
  OFFER_LOCATION_REQUIRED: 'province',
  SALARY_RANGE_INVALID: 'salaryMax',
} as const

export function NewOfferPage() {
  const { t } = useTranslation('offers')
  return (
    <>
      <BackLink to={MY_OFFERS} label={t('mine.title')} />
      <PageHeading title={t('form.newTitle')} description={t('form.newDescription')} />
      <OfferForm />
    </>
  )
}

export function EditOfferPage() {
  const { t } = useTranslation('offers')
  const { id = '' } = useParams()
  const { user } = useAuth()
  const offer = useQuery({
    queryKey: offerKeys.detail(id),
    queryFn: () => offersApi.get(id),
  })

  let content
  if (offer.isPending) {
    content = <FullPageLoader fullPage={false} />
  } else if (offer.isError) {
    content = <LoadError onRetry={() => void offer.refetch()} />
  } else if (offer.data.company.id !== user?.company?.id) {
    content = <Alert>{t('form.notOwn')}</Alert>
  } else if (offer.data.status !== 'OPEN') {
    content = <Alert variant="info">{t('form.notEditable')}</Alert>
  } else {
    content = <OfferForm offer={offer.data} />
  }

  return (
    <>
      <BackLink to={MY_OFFERS} label={t('mine.title')} />
      <PageHeading title={t('form.editTitle')} description={t('form.editDescription')} />
      {content}
    </>
  )
}

// Publishes a new offer, or edits `offer` when given.
function OfferForm({ offer }: { offer?: OfferDetail }) {
  const { t } = useTranslation('offers')
  const errorText = useErrorText()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const categories = useCategories()
  const tags = useTags()
  const tagsLabelId = useId()
  const storedDeadline = offer?.deadline ?? ''

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<OfferFormValues>({
    resolver: zodResolver(offerFormSchema(storedDeadline)),
    defaultValues: offer ? toFormValues(offer) : EMPTY_OFFER_FORM,
  })
  const isRemote = useWatch({ control, name: 'modality' }) === 'REMOTE'

  const save = useMutation({
    mutationFn: (values: OfferFormValues) => {
      const payload = toPayload(values)
      if (!offer) {
        return offersApi.create(payload)
      }
      // An unchanged deadline is not sent: if it already passed, the API would
      // reject it as a date in the past.
      const { deadline: _deadline, ...withoutDeadline } = payload
      return offersApi.update(
        offer.id,
        values.deadline === storedDeadline ? withoutDeadline : payload,
      )
    },
    onSuccess: async (saved) => {
      // The detail page opens next with the saved version, not a cached one.
      queryClient.setQueryData(offerKeys.detail(saved.id), saved)
      await queryClient.invalidateQueries({ queryKey: offerKeys.all })
      await navigate(`/offers/${saved.id}`, {
        state: { backTo: MY_OFFERS } satisfies OfferLinkState,
      })
    },
    onError: (error) => {
      const field = getErrorField(error, FIELD_BY_ERROR)
      if (field) {
        setError(field, { message: getApiErrorKey(error) }, { shouldFocus: true })
      }
    },
  })
  const fieldError = getErrorField(save.error, FIELD_BY_ERROR)

  return (
    <form
      onSubmit={handleSubmit((values) => save.mutate(values))}
      noValidate
      className="space-y-8"
    >
      <FormSection title={t('form.position')}>
        <TextField
          label={t('form.title')}
          placeholder={t('form.titlePlaceholder')}
          className="sm:col-span-2"
          error={errorText(errors.title?.message)}
          {...register('title')}
        />
        <SelectField
          label={t('form.category')}
          error={errorText(errors.categoryId?.message)}
          {...register('categoryId')}
        >
          <option value="">{t('form.choose')}</option>
          {categories.data?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
          {/* An offer keeps a category that was deactivated after it was
              published; it is still listed so the form shows it. */}
          {offer &&
            !categories.data?.some((category) => category.id === offer.category.id) && (
              <option value={offer.category.id}>{offer.category.name}</option>
            )}
        </SelectField>
        <SelectField
          label={t('form.type')}
          error={errorText(errors.type?.message)}
          {...register('type')}
        >
          {OFFER_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`type.${type}`)}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={t('form.workload')}
          error={errorText(errors.workload?.message)}
          {...register('workload')}
        >
          {WORKLOADS.map((workload) => (
            <option key={workload} value={workload}>
              {t(`workload.${workload}`)}
            </option>
          ))}
        </SelectField>
        <TextField
          label={t('form.vacancies')}
          type="number"
          min={1}
          max={100}
          inputMode="numeric"
          error={errorText(errors.vacancies?.message)}
          {...register('vacancies')}
        />
      </FormSection>

      <FormSection title={t('form.location')}>
        <SelectField
          label={t('form.modality')}
          className="sm:col-span-2"
          error={errorText(errors.modality?.message)}
          {...register('modality')}
        >
          {WORK_MODALITIES.map((modality) => (
            <option key={modality} value={modality}>
              {t(`modality.${modality}`)}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={t('form.province')}
          hint={isRemote ? undefined : t('form.provinceHint')}
          error={errorText(errors.province?.message)}
          {...register('province')}
        >
          <option value="">{t('form.choose')}</option>
          {PROVINCES.map((province) => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </SelectField>
        <TextField
          label={t('form.city')}
          error={errorText(errors.city?.message)}
          {...register('city')}
        />
      </FormSection>

      <FormSection title={t('form.details')}>
        <TextAreaField
          label={t('form.description')}
          hint={t('form.descriptionHint')}
          rows={8}
          maxLength={5000}
          className="sm:col-span-2"
          error={errorText(errors.description?.message)}
          {...register('description')}
        />
        <TextAreaField
          label={t('form.requirements')}
          hint={t('form.requirementsHint')}
          maxLength={5000}
          className="sm:col-span-2"
          error={errorText(errors.requirements?.message)}
          {...register('requirements')}
        />
      </FormSection>

      <FormSection title={t('form.conditions')}>
        <TextField
          label={t('form.salaryMin')}
          inputMode="numeric"
          hint={t('form.salaryHint')}
          error={errorText(errors.salaryMin?.message)}
          {...register('salaryMin')}
        />
        <TextField
          label={t('form.salaryMax')}
          inputMode="numeric"
          error={errorText(errors.salaryMax?.message)}
          {...register('salaryMax')}
        />
        <TextField
          label={t('form.deadline')}
          type="date"
          min={todayIsoDate()}
          hint={t('form.deadlineHint')}
          error={errorText(errors.deadline?.message)}
          {...register('deadline')}
        />
      </FormSection>

      {tags.data && tags.data.length > 0 && (
        <FormSection title={t('form.tags')}>
          <div className="sm:col-span-2">
            <p id={tagsLabelId} className="mb-3 text-sm text-muted">
              {t('form.tagsHint', { max: MAX_OFFER_TAGS })}
            </p>
            <Controller
              control={control}
              name="tagIds"
              render={({ field }) => (
                <TagToggleList
                  tags={tags.data}
                  selected={field.value}
                  max={MAX_OFFER_TAGS}
                  valueOf={(tag) => tag.id}
                  labelledBy={tagsLabelId}
                  onToggle={(id) =>
                    field.onChange(
                      field.value.includes(id)
                        ? field.value.filter((item) => item !== id)
                        : [...field.value, id],
                    )
                  }
                />
              )}
            />
          </div>
        </FormSection>
      )}

      <div className="space-y-4">
        {save.isError && !fieldError && (
          <Alert>{errorText(getApiErrorKey(save.error))}</Alert>
        )}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={save.isPending}>
            {offer ? t('form.save') : t('form.publish')}
          </Button>
          <Link to={MY_OFFERS} className={buttonStyles('secondary')}>
            {t('form.cancel')}
          </Link>
        </div>
      </div>
    </form>
  )
}
