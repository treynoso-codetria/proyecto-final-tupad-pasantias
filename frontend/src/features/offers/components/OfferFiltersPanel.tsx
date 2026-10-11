import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField } from '@/components/ui/SelectField'
import { useCategories, useTags } from '@/features/catalog/api'
import { PROVINCES } from '@/lib/provinces'
import {
  OFFER_TYPES,
  WORK_MODALITIES,
  WORKLOADS,
  type OfferFilters,
} from '../api'
import { TagToggleList } from './TagToggleList'

type OfferFiltersPanelProps = {
  filters: OfferFilters
  onChange: (changes: Partial<OfferFilters>) => void
}

// Each change applies at once (no "apply" button): the results update as
// the user narrows them down.
export function OfferFiltersPanel({ filters, onChange }: OfferFiltersPanelProps) {
  const { t } = useTranslation('offers')
  const categories = useCategories()
  const tags = useTags()
  const tagsLabelId = useId()
  const anyOption = <option value="">{t('search.any')}</option>

  const toggleTag = (slug: string) => {
    const selected = filters.tags ?? []
    onChange({
      tags: selected.includes(slug)
        ? selected.filter((item) => item !== slug)
        : [...selected, slug],
    })
  }

  return (
    <div className="space-y-5">
      <SelectField
        label={t('search.category')}
        value={filters.category ?? ''}
        onChange={(event) => onChange({ category: event.target.value || undefined })}
      >
        {anyOption}
        {categories.data?.map((category) => (
          <option key={category.id} value={category.slug}>
            {category.name}
          </option>
        ))}
      </SelectField>
      <SelectField
        label={t('search.type')}
        value={filters.type ?? ''}
        onChange={(event) =>
          onChange({ type: (event.target.value || undefined) as OfferFilters['type'] })
        }
      >
        {anyOption}
        {OFFER_TYPES.map((type) => (
          <option key={type} value={type}>
            {t(`type.${type}`)}
          </option>
        ))}
      </SelectField>
      <SelectField
        label={t('search.modality')}
        value={filters.modality ?? ''}
        onChange={(event) =>
          onChange({
            modality: (event.target.value || undefined) as OfferFilters['modality'],
          })
        }
      >
        {anyOption}
        {WORK_MODALITIES.map((modality) => (
          <option key={modality} value={modality}>
            {t(`modality.${modality}`)}
          </option>
        ))}
      </SelectField>
      <SelectField
        label={t('search.workload')}
        value={filters.workload ?? ''}
        onChange={(event) =>
          onChange({
            workload: (event.target.value || undefined) as OfferFilters['workload'],
          })
        }
      >
        {anyOption}
        {WORKLOADS.map((workload) => (
          <option key={workload} value={workload}>
            {t(`workload.${workload}`)}
          </option>
        ))}
      </SelectField>
      <SelectField
        label={t('search.province')}
        value={filters.province ?? ''}
        onChange={(event) => onChange({ province: event.target.value || undefined })}
      >
        {anyOption}
        {PROVINCES.map((province) => (
          <option key={province} value={province}>
            {province}
          </option>
        ))}
      </SelectField>
      {tags.data && tags.data.length > 0 && (
        <div>
          <p id={tagsLabelId} className="mb-2 text-sm font-bold">
            {t('search.tags')}
          </p>
          <TagToggleList
            tags={tags.data}
            selected={filters.tags ?? []}
            onToggle={toggleTag}
            valueOf={(tag) => tag.slug}
            labelledBy={tagsLabelId}
          />
        </div>
      )}
    </div>
  )
}
