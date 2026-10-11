import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { EmptyToNull } from '../../../common/decorators/optional-fields.decorator.js';
import { Trim } from '../../../common/decorators/trim.decorator.js';
import { IsId } from '../../../common/validation/ids.js';
import {
  OfferType,
  WorkModality,
  Workload,
} from '../../../generated/prisma/enums.js';
import { OFFER_LIMITS } from './offer-fields.js';

// Rules that involve more than one field (a province for on-site and hybrid
// offers, salary range) are checked by OffersService, because an update may
// send only one of the fields involved.
export class CreateOfferDto {
  @ApiProperty({ example: 'Pasante Desarrollador Frontend', maxLength: 150 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(OFFER_LIMITS.title)
  title: string;

  @ApiProperty({ maxLength: OFFER_LIMITS.description })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(OFFER_LIMITS.description)
  description: string;

  @ApiPropertyOptional({ maxLength: OFFER_LIMITS.requirements, nullable: true })
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(OFFER_LIMITS.requirements)
  requirements?: string | null;

  @ApiProperty({ enum: OfferType, enumName: 'OfferType' })
  @IsEnum(OfferType)
  type: OfferType;

  @ApiProperty({ enum: WorkModality, enumName: 'WorkModality' })
  @IsEnum(WorkModality)
  modality: WorkModality;

  @ApiProperty({ enum: Workload, enumName: 'Workload' })
  @IsEnum(Workload)
  workload: Workload;

  @ApiPropertyOptional({
    enum: PROVINCES,
    nullable: true,
    description: 'Required unless the offer is REMOTE',
  })
  @IsOptional()
  @EmptyToNull()
  @IsIn(PROVINCES)
  province?: string | null;

  @ApiPropertyOptional({ example: 'Mendoza', nullable: true })
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(OFFER_LIMITS.city)
  city?: string | null;

  @ApiPropertyOptional({
    example: 900000,
    nullable: true,
    description: 'Monthly, in ARS',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(OFFER_LIMITS.salary)
  salaryMin?: number | null;

  @ApiPropertyOptional({
    example: 1200000,
    nullable: true,
    description: 'Monthly, in ARS',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(OFFER_LIMITS.salary)
  salaryMax?: number | null;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(OFFER_LIMITS.vacancies)
  vacancies?: number;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2026-12-31',
    nullable: true,
    description: 'Last day to apply',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @MinDate(() => today(), { context: { i18nKey: 'deadlineInPast' } })
  deadline?: Date | null;

  @ApiProperty({ format: 'uuid', description: 'An active category' })
  @IsId()
  categoryId: string;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    maxItems: OFFER_LIMITS.tags,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(OFFER_LIMITS.tags)
  @ArrayUnique()
  @IsId({ each: true })
  tagIds?: string[];
}
