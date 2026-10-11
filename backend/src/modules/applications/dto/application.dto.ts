import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { EmptyToNull } from '../../../common/decorators/optional-fields.decorator.js';
import {
  ApplicationStatus,
  OfferStatus,
  OfferType,
  WorkModality,
} from '../../../generated/prisma/enums.js';

export const COVER_LETTER_MAX = 2000;

export class ApplyDto {
  @ApiPropertyOptional({
    maxLength: COVER_LETTER_MAX,
    nullable: true,
    description: 'Optional message to the company',
  })
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(COVER_LETTER_MAX)
  coverLetter?: string | null;
}

// The statuses a company can set; WITHDRAWN is only set by the student.
export const DECISIONS = [
  ApplicationStatus.ACCEPTED,
  ApplicationStatus.REJECTED,
] as const;
export type Decision = (typeof DECISIONS)[number];

export class DecideApplicationDto {
  @ApiProperty({ enum: DECISIONS })
  @IsIn(DECISIONS)
  status: Decision;
}

export class StudentApplicationsQueryDto {
  @ApiPropertyOptional({
    enum: ApplicationStatus,
    enumName: 'ApplicationStatus',
  })
  @IsOptional()
  @IsIn(Object.values(ApplicationStatus))
  status?: ApplicationStatus;
}

// Withdrawn applications are not shown to companies.
export const VISIBLE_TO_COMPANY = [
  ApplicationStatus.PENDING,
  ApplicationStatus.ACCEPTED,
  ApplicationStatus.REJECTED,
] as const;

export class ApplicantsQueryDto {
  @ApiPropertyOptional({ enum: VISIBLE_TO_COMPANY })
  @IsOptional()
  @IsIn(VISIBLE_TO_COMPANY)
  status?: (typeof VISIBLE_TO_COMPANY)[number];
}

export class ApplicationDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  offerId: string;

  @ApiProperty({ enum: ApplicationStatus, enumName: 'ApplicationStatus' })
  status: ApplicationStatus;

  @ApiProperty({ type: String, nullable: true })
  coverLetter: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "Copy of the student's CV link when they applied",
  })
  cvUrl: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  appliedAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'When the company accepted or rejected it',
  })
  reviewedAt: Date | null;
}

class ApplicationOfferDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: OfferStatus, enumName: 'OfferStatus' })
  status: OfferStatus;

  @ApiProperty({ enum: OfferType, enumName: 'OfferType' })
  type: OfferType;

  @ApiProperty({ enum: WorkModality, enumName: 'WorkModality' })
  modality: WorkModality;

  @ApiProperty({ type: String, nullable: true })
  province: string | null;

  @ApiProperty({ type: String, nullable: true })
  city: string | null;

  @ApiProperty({ example: { id: 'uuid', name: 'TechSur S.A.' } })
  company: { id: string; name: string };
}

// An application in the student's "My applications".
export class MyApplicationDto extends ApplicationDto {
  @ApiProperty({ type: ApplicationOfferDto })
  offer: ApplicationOfferDto;
}

class ApplicantStudentDto {
  @ApiProperty({ format: 'uuid', description: 'Student profile id' })
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ type: String, nullable: true })
  phone: string | null;

  @ApiProperty()
  career: string;

  @ApiProperty()
  institution: string;

  @ApiProperty({ type: Number, nullable: true })
  studyYear: number | null;

  @ApiProperty({ type: String, nullable: true })
  province: string | null;

  @ApiProperty({ type: String, nullable: true })
  city: string | null;
}

// An application as the company sees it, with the applicant.
export class ApplicantDto extends ApplicationDto {
  @ApiProperty({ type: ApplicantStudentDto })
  student: ApplicantStudentDto;
}
