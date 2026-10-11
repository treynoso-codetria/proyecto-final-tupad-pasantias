import { z } from 'zod'
import { key, requiredText } from '@/features/auth/schemas'
import { optionalText, todayIsoDate } from '@/lib/form-schemas'
import { toFormText, toNullableText } from '@/lib/form-values'
import {
  MAX_OFFER_TAGS,
  OFFER_TYPES,
  WORK_MODALITIES,
  WORKLOADS,
  type OfferDetail,
  type OfferInput,
} from './api'

// Pesos without cents: the form asks for whole amounts.
const optionalAmount = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\d{1,10}$/.test(value), {
    message: key('validation.amountInvalid'),
  })

// The limits mirror backend/src/modules/offers/dto.
// `storedDeadline`: when editing, the deadline the offer already has, which is
// accepted even if it has passed (only a new deadline must not be past).
export function offerFormSchema(storedDeadline = '') {
  return z
    .object({
      title: requiredText(150),
      categoryId: z.string().min(1, key('validation.choose')),
      type: z.enum(OFFER_TYPES),
      workload: z.enum(WORKLOADS),
      vacancies: z
        .string()
        .refine((value) => /^\d+$/.test(value) && +value >= 1 && +value <= 100, {
          message: key('validation.vacanciesInvalid'),
        }),
      modality: z.enum(WORK_MODALITIES),
      province: z.string(),
      city: optionalText(100),
      description: requiredText(5000),
      requirements: optionalText(5000),
      salaryMin: optionalAmount,
      salaryMax: optionalAmount,
      deadline: z
        .string()
        .refine(
          (value) =>
            value === '' || value === storedDeadline || value >= todayIsoDate(),
          { message: key('validation.dateInPast') },
        ),
      tagIds: z.array(z.string()).max(MAX_OFFER_TAGS),
    })
    .superRefine((values, context) => {
      if (values.modality !== 'REMOTE' && values.province === '') {
        context.addIssue({
          code: 'custom',
          path: ['province'],
          message: key('validation.provinceRequired'),
        })
      }
      if (
        values.salaryMin !== '' &&
        values.salaryMax !== '' &&
        Number(values.salaryMin) > Number(values.salaryMax)
      ) {
        context.addIssue({
          code: 'custom',
          path: ['salaryMax'],
          message: key('validation.salaryRange'),
        })
      }
    })
}

export type OfferFormValues = z.infer<ReturnType<typeof offerFormSchema>>

export const EMPTY_OFFER_FORM: OfferFormValues = {
  title: '',
  categoryId: '',
  type: 'INTERNSHIP',
  workload: 'PART_TIME',
  vacancies: '1',
  modality: 'ON_SITE',
  province: '',
  city: '',
  description: '',
  requirements: '',
  salaryMin: '',
  salaryMax: '',
  deadline: '',
  tagIds: [],
}

export function toFormValues(offer: OfferDetail): OfferFormValues {
  return {
    title: offer.title,
    categoryId: offer.category.id,
    type: offer.type,
    workload: offer.workload,
    vacancies: String(offer.vacancies),
    modality: offer.modality,
    province: toFormText(offer.province),
    city: toFormText(offer.city),
    description: offer.description,
    requirements: toFormText(offer.requirements),
    salaryMin: toFormText(offer.salaryMin),
    salaryMax: toFormText(offer.salaryMax),
    deadline: toFormText(offer.deadline),
    tagIds: offer.tags.map((tag) => tag.id),
  }
}

const toAmount = (value: string) => (value.trim() === '' ? null : Number(value))

export function toPayload(values: OfferFormValues): OfferInput {
  return {
    title: values.title,
    categoryId: values.categoryId,
    type: values.type,
    workload: values.workload,
    vacancies: Number(values.vacancies),
    modality: values.modality,
    province: toNullableText(values.province),
    city: toNullableText(values.city),
    description: values.description,
    requirements: toNullableText(values.requirements),
    salaryMin: toAmount(values.salaryMin),
    salaryMax: toAmount(values.salaryMax),
    deadline: toNullableText(values.deadline),
    tagIds: values.tagIds,
  }
}
