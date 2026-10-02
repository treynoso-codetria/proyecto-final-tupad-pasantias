import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizeEmail } from '../../../common/decorators/normalize-email.decorator.js';

// Credentials shared by every registration flow.
export class RegisterAccountDto {
  @ApiProperty({ example: 'ana.gomez@alumnos.dev', maxLength: 255 })
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(255)
  email: string;

  // bcrypt only hashes the first 72 bytes, so longer passwords are rejected.
  @ApiProperty({ example: 'Password123!', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
