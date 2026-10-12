import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { ParseIdPipe } from '../../common/validation/ids.js';
import { UserRole } from '../../generated/prisma/enums.js';
import {
  ConversationDto,
  ConversationPageDto,
  ConversationsQueryDto,
  MessageDto,
  SendMessageDto,
  UnreadMessagesDto,
} from './dto/message.dto.js';
import { MessagesService } from './messages.service.js';

// A conversation belongs to an application: its id is the application id.
@ApiTags('messages')
@ApiBearerAuth()
@Roles(UserRole.STUDENT, UserRole.EMPLOYER)
@Controller('conversations')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  @ApiOperation({
    summary: 'List the conversations of the authenticated user',
    description:
      'Only conversations with messages, the most recently active first.',
  })
  @ApiOkResponse({ type: ConversationPageDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ConversationsQueryDto,
  ): Promise<ConversationPageDto> {
    return this.messages.listConversations(user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Count the unread messages, in every conversation',
    description: 'Cheap enough to be polled by the navigation bar.',
  })
  @ApiOkResponse({ type: UnreadMessagesDto })
  async unreadCount(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UnreadMessagesDto> {
    return { count: await this.messages.countUnread(user.id) };
  }

  @Get(':applicationId')
  @ApiOperation({
    summary: 'Get the conversation of an application',
    description:
      'Available to the student of the application and to the company ' +
      'that owns the offer. It does not mark the messages as read.',
  })
  @ApiOkResponse({ type: ConversationDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('applicationId', ParseIdPipe) applicationId: string,
  ): Promise<ConversationDto> {
    return this.messages.getConversation(user.id, applicationId);
  }

  @Post(':applicationId/messages')
  @ApiOperation({ summary: 'Send a message' })
  @ApiCreatedResponse({ type: MessageDto })
  @ApiBadRequestResponse({
    description: 'Validation failed',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'The application was withdrawn or the offer removed',
    type: ErrorResponseDto,
  })
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Param('applicationId', ParseIdPipe) applicationId: string,
    @Body() dto: SendMessageDto,
  ): Promise<MessageDto> {
    return this.messages.send(user.id, applicationId, dto.body);
  }

  @Post(':applicationId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Mark the messages received in the conversation as read',
  })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('applicationId', ParseIdPipe) applicationId: string,
  ): Promise<void> {
    return this.messages.markRead(user.id, applicationId);
  }
}
