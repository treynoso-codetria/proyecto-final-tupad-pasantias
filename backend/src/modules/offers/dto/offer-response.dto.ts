import { ApiProperty } from '@nestjs/swagger';
import {
  OfferStatus,
  OfferType,
  WorkModality,
  Workload,
} from '../../../generated/prisma/enums.js';
import { CatalogItemDto } from '../../catalog/dto/catalog-item.dto.js';

export class OfferCompanyDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'TechSur S.A.' })
  name: string;

  @ApiProperty({ type: String, nullable: true })
  logoUrl: string | null;
}

export class OfferCompanyDetailDto extends OfferCompanyDto {
  @ApiProperty({ type: String, nullable: true })
  industry: string | null;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, nullable: true })
  website: string | null;

  @ApiProperty({ type: String, nullable: true })
  province: string | null;

  @ApiProperty({ type: String, nullable: true })
  city: string | null;
}

// An offer in a list: enough to show a card.
export class OfferSummaryDto {
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

  @ApiProperty({ type: String, example: 'Mendoza', nullable: true })
  province: string | null;

  @ApiProperty({ type: String, example: 'Mendoza', nullable: true })
  city: string | null;

  @ApiProperty({ type: Number, nullable: true, description: 'Monthly, in ARS' })
  salaryMin: number | null;

  @ApiProperty({ type: Number, nullable: true, description: 'Monthly, in ARS' })
  salaryMax: number | null;

  @ApiProperty({ enum: OfferStatus, enumName: 'OfferStatus' })
  status: OfferStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  publishedAt: Date;

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    description: 'Last day to apply',
  })
  deadline: string | null;

  @ApiProperty({ type: OfferCompanyDto })
  company: OfferCompanyDto;

  @ApiProperty({ type: CatalogItemDto })
  category: CatalogItemDto;

  @ApiProperty({ type: [CatalogItemDto] })
  tags: CatalogItemDto[];
}

export class OfferDetailDto extends OfferSummaryDto {
  @ApiProperty()
  description: string;

  @ApiProperty({ type: String, nullable: true })
  requirements: string | null;

  @ApiProperty({ example: 1 })
  vacancies: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  closedAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;

  @ApiProperty({
    description:
      'Whether students can apply right now: open, deadline not passed and ' +
      'the company account active',
  })
  isAcceptingApplications: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Why an administrator removed the offer. Only sent to its company and ' +
      'to administrators; null for everyone else.',
  })
  removalReason: string | null;

  @ApiProperty({ type: OfferCompanyDetailDto })
  declare company: OfferCompanyDetailDto;
}

// An offer in the employer's "My offers" list.
export class MyOfferDto extends OfferSummaryDto {
  @ApiProperty({
    description: 'Applications received, excluding the ones withdrawn',
  })
  applicationsCount: number;

  @ApiProperty({ description: 'Applications not yet accepted or rejected' })
  pendingApplicationsCount: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  closedAt: Date | null;

  @ApiProperty({ type: String, nullable: true })
  removalReason: string | null;
}

export class OfferPageDto {
  @ApiProperty({ type: [OfferSummaryDto] })
  items: OfferSummaryDto[];

  @ApiProperty({ example: 42, description: 'Offers matching the filters' })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 12 })
  limit: number;

  @ApiProperty({ example: 4 })
  totalPages: number;
}
