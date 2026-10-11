import { ApiProperty } from '@nestjs/swagger';
import {
  OfferType,
  WorkModality,
  Workload,
} from '../../../generated/prisma/enums.js';

// Fields of a company that anyone can see.
class CompanyPublicFieldsDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'TechSur S.A.' })
  name: string;

  @ApiProperty({ type: String, example: 'Software', nullable: true })
  industry: string | null;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, nullable: true })
  website: string | null;

  @ApiProperty({ type: String, nullable: true })
  logoUrl: string | null;

  @ApiProperty({ type: String, example: 'Mendoza', nullable: true })
  province: string | null;

  @ApiProperty({ type: String, example: 'Godoy Cruz', nullable: true })
  city: string | null;
}

// The company as its own employer sees and edits it.
export class CompanyResponseDto extends CompanyPublicFieldsDto {
  @ApiProperty({
    example: 'rrhh@techsur.dev',
    description: 'Email of the account; changed through /users/me/email-change',
  })
  email: string;

  @ApiProperty({ example: '30-71234567-8' })
  cuit: string;

  @ApiProperty({ type: String, example: '+54 261 555-0100', nullable: true })
  phone: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

export class CompanyOfferSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Pasante Desarrollador Frontend' })
  title: string;

  @ApiProperty({ enum: OfferType, enumName: 'OfferType' })
  type: OfferType;

  @ApiProperty({ enum: WorkModality, enumName: 'WorkModality' })
  modality: WorkModality;

  @ApiProperty({ enum: Workload, enumName: 'Workload' })
  workload: Workload;

  @ApiProperty({ type: String, nullable: true })
  province: string | null;

  @ApiProperty({ type: String, nullable: true })
  city: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  publishedAt: Date;

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    description: 'Last day to apply',
  })
  deadline: string | null;
}

// Public page of a company: its public data and the offers open right now.
export class PublicCompanyResponseDto extends CompanyPublicFieldsDto {
  @ApiProperty({ type: [CompanyOfferSummaryDto] })
  openOffers: CompanyOfferSummaryDto[];
}
