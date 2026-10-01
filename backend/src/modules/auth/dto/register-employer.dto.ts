import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator.js';
import { RegisterAccountDto } from './register-account.dto.js';

export class RegisterEmployerDto extends RegisterAccountDto {
  @ApiProperty({ example: 'TechSur S.A.', maxLength: 150 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  companyName: string;

  @ApiProperty({ example: '30-71234567-8', pattern: '^\\d{2}-\\d{8}-\\d$' })
  @Trim()
  @Matches(/^\d{2}-\d{8}-\d$/, {
    message: 'cuit must have the format XX-XXXXXXXX-X',
  })
  cuit: string;
}
