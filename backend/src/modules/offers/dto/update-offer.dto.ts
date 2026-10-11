import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinDate,
} from 'class-validator';
import { PROVINCES } from '../../../common/constants/provinces.js';
import { today } from '../../../common/dates.js';
import {
  EmptyToNull,
  IfDefined,
} from '../../../common/decorators/optional-fields.decorator.js';
import { Trim } from '../../../common/decorators/trim.decorator.js';
import { IsId } from '../../../common/validation/ids.js';
import {
  OfferType,
  WorkModality,
  Workload,
} from '../../../generated/prisma/enums.js';
import { OFFER_LIMITS } from './offer-fields.js';

// Same fields as CreateOfferDto, all optional: only the ones sent change.
// Required fields can be omitted but not nulled (@IfDefined); nullable ones
// are cleared with null. Sending `tagIds` replaces all the tags.
export class UpdateOfferDto {
  @ApiPropertyOptional({ maxLength: OFFER_LIMITS.title })
  @IfDefined()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(OFFER_LIMITS.title)
  title?: string;

  @ApiPropertyOptional({ maxLength: OFFER_LIMITS.description })
  @IfDefined()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(OFFER_LIMITS.description)
  description?: string;

  @ApiPropertyOptional({ maxLength: OFFER_LIMITS.requirements, nullable: true })
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(OFFER_LIMITS.requirements)
  requirements?: string | null;

  @ApiPropertyOptional({ enum: OfferType, enumName: 'OfferType' })
  @IfDefined()
  @IsEnum(OfferType)
  type?: OfferType;

  @ApiPropertyOptional({ enum: WorkModality, enumName: 'WorkModality' })
  @IfDefined()
  @IsEnum(WorkModality)
  modality?: WorkModality;

  @ApiPropertyOptional({ enum: Workload, enumName: 'Workload' })
  @IfDefined()
  @IsEnum(Workload)
  workload?: Workload;

  @ApiPropertyOptional({ enum: PROVINCES, nullable: true })
  @IsOptional()
  @EmptyToNull()
  @IsIn(PROVINCES)
  province?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(OFFER_LIMITS.city)
  city?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(OFFER_LIMITS.salary)
  salaryMin?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(OFFER_LIMITS.salary)
  salaryMax?: number | null;

  @ApiPropertyOptional({ minimum: 1 })
  @IfDefined()
  @IsInt()
  @Min(1)
  @Max(OFFER_LIMITS.vacancies)
  vacancies?: number;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @MinDate(() => today(), { context: { i18nKey: 'deadlineInPast' } })
  deadline?: Date | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IfDefined()
  @IsId()
  categoryId?: string;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IfDefined()
  @IsArray()
  @ArrayMaxSize(OFFER_LIMITS.tags)
  @ArrayUnique()
  @IsId({ each: true })
  tagIds?: string[];
}
