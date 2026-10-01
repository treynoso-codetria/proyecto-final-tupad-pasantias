import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator.js';
import { RegisterAccountDto } from './register-account.dto.js';

export class RegisterStudentDto extends RegisterAccountDto {
  @ApiProperty({ example: 'Ana', maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Gómez', maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({
    example: 'Tecnicatura Universitaria en Programación',
    maxLength: 150,
  })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  career: string;

  @ApiProperty({ example: 'UTN Facultad Regional Mendoza', maxLength: 150 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  institution: string;
}
