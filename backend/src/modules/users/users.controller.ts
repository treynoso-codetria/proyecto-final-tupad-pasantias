import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { EmailTokenDto } from '../auth/dto/email-token.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { EmailChangedResponseDto } from './dto/email-changed-response.dto.js';
import { RequestEmailChangeDto } from './dto/request-email-change.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change the password of the authenticated user' })
  @ApiNoContentResponse({ description: 'Password changed' })
  @ApiBadRequestResponse({
    description:
      'Validation failed, wrong current password, or new password equal to the current one',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.usersService.changePassword(user.id, dto);
  }

  @Post('me/email-change')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Request an email change',
    description:
      'Sends a confirmation link to the new address. The email only changes ' +
      'when that link is opened (POST /users/email-change/confirm).',
  })
  @ApiNoContentResponse({ description: 'Confirmation email sent' })
  @ApiBadRequestResponse({
    description:
      'Validation failed, wrong current password, or new email equal to the current one',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'Email is already registered',
    type: ErrorResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'The confirmation email could not be sent',
    type: ErrorResponseDto,
  })
  requestEmailChange(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestEmailChangeDto,
  ): Promise<void> {
    return this.usersService.requestEmailChange(user.id, dto);
  }

  // Public: the link may be opened in a browser where the user is not logged
  // in. The signed token identifies the account.
  @Public()
  @Post('email-change/confirm')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Confirm an email change with the emailed token' })
  @ApiOkResponse({ type: EmailChangedResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid, expired or already used link',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email is already registered',
    type: ErrorResponseDto,
  })
  confirmEmailChange(
    @Body() dto: EmailTokenDto,
  ): Promise<EmailChangedResponseDto> {
    return this.usersService.confirmEmailChange(dto.token);
  }
}
