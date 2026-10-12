import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator.js';
import { ApplicationStatus } from '../../../generated/prisma/enums.js';

export const MESSAGE_MAX = 2000;

export class SendMessageDto {
  @ApiProperty({ maxLength: MESSAGE_MAX })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(MESSAGE_MAX)
  body: string;
}

export class ConversationsQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}

export class MessageDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  body: string;

  @ApiProperty({ description: 'Sent by the authenticated user' })
  mine: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'When the recipient read it',
  })
  readAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}

class ConversationOfferDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;
}

// The other participant: a company for the student, a student for the
// company.
class CounterpartDto {
  @ApiProperty({ example: 'TechSur S.A.' })
  name: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'Company id, when the other participant is a company',
  })
  companyId: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Link to the company logo',
  })
  logoUrl: string | null;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'Student profile id, when the other participant is a student',
  })
  studentId: string | null;
}

class ConversationBaseDto {
  @ApiProperty({
    format: 'uuid',
    description: 'A conversation is identified by its application',
  })
  applicationId: string;

  @ApiProperty({ enum: ApplicationStatus, enumName: 'ApplicationStatus' })
  applicationStatus: ApplicationStatus;

  @ApiProperty({ type: ConversationOfferDto })
  offer: ConversationOfferDto;

  @ApiProperty({ type: CounterpartDto })
  counterpart: CounterpartDto;

  @ApiProperty({
    description:
      'False once the application was withdrawn or the offer removed: the ' +
      'conversation can still be read',
  })
  canSend: boolean;

  @ApiProperty({ description: 'Messages received and not read yet' })
  unreadCount: number;
}

class LastMessageDto {
  @ApiProperty()
  body: string;

  @ApiProperty()
  mine: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}

export class ConversationSummaryDto extends ConversationBaseDto {
  @ApiProperty({ type: LastMessageDto })
  lastMessage: LastMessageDto;
}

export class ConversationPageDto {
  @ApiProperty({ type: [ConversationSummaryDto] })
  items: ConversationSummaryDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class ConversationDto extends ConversationBaseDto {
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Message the student applied with; opens the conversation',
  })
  coverLetter: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  appliedAt: Date;

  @ApiProperty({ type: [MessageDto], description: 'Oldest first' })
  messages: MessageDto[];
}

export class UnreadMessagesDto {
  @ApiProperty({ example: 2 })
  count: number;
}
