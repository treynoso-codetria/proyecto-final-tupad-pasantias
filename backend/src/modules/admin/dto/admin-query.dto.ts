import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator.js';
import { OfferStatus } from '../../../generated/prisma/enums.js';

export class AdminPageQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}

// Administrators are not listed: their accounts are not managed from the
// panel.
export const MANAGED_ROLES = ['STUDENT', 'EMPLOYER'] as const;
export type ManagedRole = (typeof MANAGED_ROLES)[number];

export const ACCOUNT_STATUSES = ['active', 'inactive'] as const;
export type AccountStatusFilter = (typeof ACCOUNT_STATUSES)[number];

export class AdminUsersQueryDto extends AdminPageQueryDto {
  @ApiPropertyOptional({
    description:
      "Text to look for in the email, the student's name or the company's " +
      'name or CUIT',
    example: 'techsur',
  })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: MANAGED_ROLES })
  @IsOptional()
  @IsIn(MANAGED_ROLES)
  role?: ManagedRole;

  @ApiPropertyOptional({ enum: ACCOUNT_STATUSES })
  @IsOptional()
  @IsIn(ACCOUNT_STATUSES)
  status?: AccountStatusFilter;
}

export class AdminOffersQueryDto extends AdminPageQueryDto {
  @ApiPropertyOptional({
    description: "Text to look for in the title or the company's name",
    example: 'frontend',
  })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: OfferStatus, enumName: 'OfferStatus' })
  @IsOptional()
  @IsIn(Object.values(OfferStatus))
  status?: OfferStatus;
}
