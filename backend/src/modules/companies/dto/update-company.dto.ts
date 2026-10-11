import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';
import { PROVINCES } from '../../../common/constants/provinces.js';
import {
  EmptyToNull,
  IfDefined,
  PHONE_PATTERN,
} from '../../../common/decorators/optional-fields.decorator.js';
import { Trim } from '../../../common/decorators/trim.decorator.js';

// Every field is optional: only the ones sent are changed. Fields documented
// as nullable are cleared by sending null (or an empty string).
export class UpdateCompanyDto {
  @ApiPropertyOptional({ example: 'TechSur S.A.', maxLength: 150 })
  @IfDefined()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    example: '30-71234567-8',
    pattern: '^\\d{2}-\\d{8}-\\d$',
  })
  @IfDefined()
  @Trim()
  @Matches(/^\d{2}-\d{8}-\d$/, {
    message: 'cuit must have the format XX-XXXXXXXX-X',
    context: { i18nKey: 'cuitFormat' },
  })
  cuit?: string;

  @ApiPropertyOptional({ example: 'Software', maxLength: 100, nullable: true })
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(100)
  industry?: string | null;

  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({
    example: 'https://techsur.example.com',
    nullable: true,
  })
  @IsOptional()
  @EmptyToNull()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  website?: string | null;

  @ApiPropertyOptional({ example: '+54 261 555-0100', nullable: true })
  @IsOptional()
  @EmptyToNull()
  @Matches(PHONE_PATTERN, { context: { i18nKey: 'phoneFormat' } })
  phone?: string | null;

  @ApiPropertyOptional({ enum: PROVINCES, nullable: true })
  @IsOptional()
  @EmptyToNull()
  @IsIn(PROVINCES)
  province?: string | null;

  @ApiPropertyOptional({
    example: 'Godoy Cruz',
    maxLength: 100,
    nullable: true,
  })
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(100)
  city?: string | null;
}
