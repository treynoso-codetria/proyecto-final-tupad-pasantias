import { ApiProperty } from '@nestjs/swagger';
import { AuthUserDto } from './auth-response.dto.js';

export class StudentSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Ana' })
  firstName: string;

  @ApiProperty({ example: 'Gómez' })
  lastName: string;
}

export class CompanySummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'TechSur S.A.' })
  name: string;
}

export class MeResponseDto extends AuthUserDto {
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastLoginAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({
    type: StudentSummaryDto,
    nullable: true,
    description: 'Only present for STUDENT accounts',
  })
  studentProfile: StudentSummaryDto | null;

  @ApiProperty({
    type: CompanySummaryDto,
    nullable: true,
    description: 'Only present for EMPLOYER accounts',
  })
  company: CompanySummaryDto | null;
}
