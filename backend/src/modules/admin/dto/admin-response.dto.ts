import { ApiProperty } from '@nestjs/swagger';
import {
  AdminActionType,
  OfferStatus,
  UserRole,
} from '../../../generated/prisma/enums.js';
import { CatalogItemDto } from '../../catalog/dto/catalog-item.dto.js';

class AccountCountDto {
  @ApiProperty({ example: 120 })
  total: number;

  @ApiProperty({ example: 117 })
  active: number;
}

class OfferCountDto {
  @ApiProperty({ example: 30 })
  open: number;

  @ApiProperty({ example: 12 })
  closed: number;

  @ApiProperty({ example: 2 })
  removed: number;
}

class ApplicationCountDto {
  @ApiProperty({ description: 'Excluding the ones withdrawn', example: 85 })
  total: number;

  @ApiProperty({ example: 40 })
  pending: number;

  @ApiProperty({ example: 25 })
  accepted: number;

  @ApiProperty({ example: 20 })
  rejected: number;
}

export class AdminStatsDto {
  @ApiProperty({ type: AccountCountDto })
  students: AccountCountDto;

  @ApiProperty({ type: AccountCountDto })
  companies: AccountCountDto;

  @ApiProperty({ type: OfferCountDto })
  offers: OfferCountDto;

  @ApiProperty({ type: ApplicationCountDto })
  applications: ApplicationCountDto;
}

export class AdminUserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'ana.gomez@alumnos.dev' })
  email: string;

  @ApiProperty({ enum: [UserRole.STUDENT, UserRole.EMPLOYER] })
  role: UserRole;

  @ApiProperty({ description: "Student's full name or company name" })
  name: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'Student profile id (students only)',
  })
  studentId: string | null;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'Company id (employers only)',
  })
  companyId: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ description: 'Whether the email address was confirmed' })
  emailVerified: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastLoginAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}

export class AdminUserPageDto {
  @ApiProperty({ type: [AdminUserDto] })
  items: AdminUserDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

class AdminOfferCompanyDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'TechSur S.A.' })
  name: string;

  @ApiProperty({ description: "Whether the company's account is active" })
  isActive: boolean;
}

export class AdminOfferDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Pasante Desarrollador Frontend' })
  title: string;

  @ApiProperty({ enum: OfferStatus, enumName: 'OfferStatus' })
  status: OfferStatus;

  @ApiProperty({ type: AdminOfferCompanyDto })
  company: AdminOfferCompanyDto;

  @ApiProperty({ type: CatalogItemDto })
  category: CatalogItemDto;

  @ApiProperty({ description: 'Applications, excluding the ones withdrawn' })
  applicationsCount: number;

  @ApiProperty({ type: String, format: 'date-time' })
  publishedAt: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  closedAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  removedAt: Date | null;

  @ApiProperty({ type: String, nullable: true })
  removalReason: string | null;
}

export class AdminOfferPageDto {
  @ApiProperty({ type: [AdminOfferDto] })
  items: AdminOfferDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

class ActionAdminDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'admin@pasantias.dev' })
  email: string;
}

class ActionUserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ description: "Student's full name or company name" })
  name: string;
}

class ActionOfferDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;
}

export class AdminActionDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: AdminActionType, enumName: 'AdminActionType' })
  action: AdminActionType;

  @ApiProperty({ type: String, nullable: true })
  reason: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: ActionAdminDto })
  admin: ActionAdminDto;

  @ApiProperty({
    type: ActionUserDto,
    nullable: true,
    description: 'For account actions; null if the account was deleted',
  })
  targetUser: ActionUserDto | null;

  @ApiProperty({
    type: ActionOfferDto,
    nullable: true,
    description: 'For offer actions; null if the offer was deleted',
  })
  targetOffer: ActionOfferDto | null;
}

export class AdminActionPageDto {
  @ApiProperty({ type: [AdminActionDto] })
  items: AdminActionDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}
