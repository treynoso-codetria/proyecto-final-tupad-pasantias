import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { NormalizeEmail } from '../../../common/decorators/normalize-email.decorator.js';

export class RequestEmailChangeDto {
  @ApiProperty({ example: 'ana.nueva@alumnos.dev', maxLength: 255 })
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(255)
  newEmail: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;
}
