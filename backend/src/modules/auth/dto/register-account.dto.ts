import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

// Credentials shared by every registration flow.
export class RegisterAccountDto {
  @ApiProperty({ example: 'ana.gomez@alumnos.dev', maxLength: 255 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
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
