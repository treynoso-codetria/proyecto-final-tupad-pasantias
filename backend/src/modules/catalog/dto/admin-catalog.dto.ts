import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IfDefined } from '../../../common/decorators/optional-fields.decorator.js';
import { Trim } from '../../../common/decorators/trim.decorator.js';
import { CatalogItemDto } from './catalog-item.dto.js';

// Name lengths follow the columns (categories.name VARCHAR(100), tags.name
// VARCHAR(60)). The slug is derived from the name, never sent.

export class CreateCategoryDto {
  @ApiProperty({ example: 'Ciberseguridad', maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    example: 'Seguridad informática',
    maxLength: 100,
    description: 'Renaming also changes the slug',
  })
  @IfDefined()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description:
      'An inactive category cannot be chosen for new offers nor used as a ' +
      'filter; offers that already have it keep it.',
  })
  @IfDefined()
  @IsBoolean()
  isActive?: boolean;
}

export class TagNameDto {
  @ApiProperty({ example: 'Angular', maxLength: 60 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;
}

export class AdminCategoryDto extends CatalogItemDto {
  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ description: 'Offers in any status with this category' })
  offersCount: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

export class AdminTagDto extends CatalogItemDto {
  @ApiProperty({ description: 'Offers in any status with this tag' })
  offersCount: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}
