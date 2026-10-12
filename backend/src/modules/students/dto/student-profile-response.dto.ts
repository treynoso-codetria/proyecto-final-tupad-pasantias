import { ApiProperty, OmitType } from '@nestjs/swagger';

export class StudentProfileResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    example: 'ana.gomez@alumnos.dev',
    description: 'Email of the account; changed through /users/me/email-change',
  })
  email: string;

  @ApiProperty({ example: 'Ana' })
  firstName: string;

  @ApiProperty({ example: 'Gómez' })
  lastName: string;

  @ApiProperty({ type: String, example: '+54 261 555-0101', nullable: true })
  phone: string | null;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2003-05-14',
    nullable: true,
  })
  birthDate: string | null;

  @ApiProperty({ example: 'Tecnicatura en Programación' })
  career: string;

  @ApiProperty({ example: 'UTN Facultad Regional Mendoza' })
  institution: string;

  @ApiProperty({ type: Number, example: 2, nullable: true })
  studyYear: number | null;

  @ApiProperty({ type: String, example: 'Mendoza', nullable: true })
  province: string | null;

  @ApiProperty({ type: String, example: 'Godoy Cruz', nullable: true })
  city: string | null;

  @ApiProperty({ type: String, nullable: true })
  bio: string | null;

  @ApiProperty({ type: String, nullable: true })
  portfolioUrl: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Signed link to the CV (PDF), valid for at least an hour',
  })
  cvUrl: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Original name of the CV file',
  })
  cvFileName: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

// What a company sees of a student who applied to one of its offers: the
// same profile without the date of birth, which is not relevant to a hiring
// decision.
export class StudentProfileViewDto extends OmitType(StudentProfileResponseDto, [
  'birthDate',
] as const) {}
