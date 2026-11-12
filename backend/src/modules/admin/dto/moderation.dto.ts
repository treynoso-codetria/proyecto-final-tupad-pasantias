import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { EmptyToNull } from '../../../common/decorators/optional-fields.decorator.js';
import { Trim } from '../../../common/decorators/trim.decorator.js';

const REASON_MAX = 1000;

export class SetUserStatusDto {
  @ApiProperty({
    description: 'false deactivates the account, true reactivates it',
  })
  @IsBoolean()
  isActive: boolean;

  @ApiPropertyOptional({
    maxLength: REASON_MAX,
    example: 'Publicaciones engañosas reiteradas',
    description:
      'Required to deactivate: it is sent to the user. Optional to reactivate.',
  })
  @ValidateIf(
    (dto: SetUserStatusDto) => dto.isActive === false || dto.reason != null,
  )
  @EmptyToNull()
  @IsString()
  @IsNotEmpty()
  @MaxLength(REASON_MAX)
  reason?: string | null;
}

export class RemoveOfferDto {
  @ApiProperty({
    maxLength: REASON_MAX,
    example: 'La oferta pide pagar para postularse',
    description: 'Shown to the company that published the offer',
  })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(REASON_MAX)
  reason: string;
}

export class RestoreOfferDto {
  @ApiPropertyOptional({ maxLength: REASON_MAX })
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(REASON_MAX)
  reason?: string | null;
}
