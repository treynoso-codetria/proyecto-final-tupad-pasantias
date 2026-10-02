import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';
import { NormalizeEmail } from '../../../common/decorators/normalize-email.decorator.js';

export class ResendVerificationDto {
  @ApiProperty({ example: 'ana.gomez@alumnos.dev' })
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(255)
  email: string;
}
