import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxDate,
  MaxLength,
  Min,
  MinDate,
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
export class UpdateStudentProfileDto {
  @ApiPropertyOptional({ example: 'Ana', maxLength: 100 })
  @IfDefined()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Gómez', maxLength: 100 })
  @IfDefined()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: 'Tecnicatura en Programación' })
  @IfDefined()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  career?: string;

  @ApiPropertyOptional({ example: 'UTN Facultad Regional Mendoza' })
  @IfDefined()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  institution?: string;

  @ApiPropertyOptional({ example: '+54 261 555-0101', nullable: true })
  @IsOptional()
  @EmptyToNull()
  @Matches(PHONE_PATTERN, { context: { i18nKey: 'phoneFormat' } })
  phone?: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2003-05-14',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @MinDate(new Date('1900-01-01'))
  @MaxDate(() => new Date())
  birthDate?: Date | null;

  @ApiPropertyOptional({
    example: 2,
    minimum: 1,
    maximum: 10,
    nullable: true,
    description: 'Current year of the degree',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  studyYear?: number | null;

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

  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(2000)
  bio?: string | null;

  @ApiPropertyOptional({ example: 'https://github.com/ana', nullable: true })
  @IsOptional()
  @EmptyToNull()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  portfolioUrl?: string | null;
}
