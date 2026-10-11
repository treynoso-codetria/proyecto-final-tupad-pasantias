import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PROVINCES } from '../../../common/constants/provinces.js';
import { Trim } from '../../../common/decorators/trim.decorator.js';
import {
  OfferType,
  WorkModality,
  Workload,
} from '../../../generated/prisma/enums.js';

export const OFFER_SORTS = ['newest', 'deadline'] as const;
export type OfferSort = (typeof OFFER_SORTS)[number];

export class ListOffersQueryDto {
  @ApiPropertyOptional({
    description: 'Text to look for in the title and the description',
    example: 'react',
  })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    description: 'Category slug',
    example: 'desarrollo-de-software',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @ApiPropertyOptional({
    description:
      'Tag slugs, repeated (?tags=a&tags=b) or comma-separated. Offers with ' +
      'any of them match.',
    type: [String],
    example: ['react', 'typescript'],
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    (Array.isArray(value) ? value : [value])
      .flatMap((item) => String(item).split(','))
      .map((item) => item.trim())
      .filter(Boolean),
  )
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: OfferType, enumName: 'OfferType' })
  @IsOptional()
  @IsEnum(OfferType)
  type?: OfferType;

  @ApiPropertyOptional({ enum: WorkModality, enumName: 'WorkModality' })
  @IsOptional()
  @IsEnum(WorkModality)
  modality?: WorkModality;

  @ApiPropertyOptional({ enum: Workload, enumName: 'Workload' })
  @IsOptional()
  @IsEnum(Workload)
  workload?: Workload;

  @ApiPropertyOptional({ enum: PROVINCES })
  @IsOptional()
  @IsIn(PROVINCES)
  province?: string;

  @ApiPropertyOptional({
    enum: OFFER_SORTS,
    default: 'newest',
    description:
      'newest: most recently published first; deadline: closing soonest first',
  })
  @IsOptional()
  @IsIn(OFFER_SORTS)
  sort: OfferSort = 'newest';

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 12;
}
