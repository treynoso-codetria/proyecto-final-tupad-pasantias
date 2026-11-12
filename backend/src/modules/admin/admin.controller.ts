import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
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
import { AdminService } from './admin.service.js';
import {
  AdminOffersQueryDto,
  AdminPageQueryDto,
  AdminUsersQueryDto,
} from './dto/admin-query.dto.js';
import {
  AdminActionPageDto,
  AdminOfferDto,
  AdminOfferPageDto,
  AdminStatsDto,
  AdminUserDto,
  AdminUserPageDto,
} from './dto/admin-response.dto.js';
import {
  RemoveOfferDto,
  RestoreOfferDto,
  SetUserStatusDto,
} from './dto/moderation.dto.js';

@ApiTags('admin: moderation')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Counts of accounts, offers and applications for the dashboard',
  })
  @ApiOkResponse({ type: AdminStatsDto })
  getStats(): Promise<AdminStatsDto> {
    return this.admin.getStats();
  }

  @Get('users')
  @ApiOperation({
    summary: 'Search student and employer accounts, newest first',
  })
  @ApiOkResponse({ type: AdminUserPageDto })
  listUsers(@Query() query: AdminUsersQueryDto): Promise<AdminUserPageDto> {
    return this.admin.listUsers(query);
  }

  @Patch('users/:id/status')
  @ApiOperation({
    summary: 'Activate or deactivate a student or employer account',
    description:
      'A deactivated account cannot log in, and the offers of a deactivated ' +
      'company are hidden. The user is notified and emailed.',
  })
  @ApiOkResponse({ type: AdminUserDto })
  @ApiBadRequestResponse({
    description: 'Validation failed, or the account is an administrator',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'The account already has that status',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  setUserStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: SetUserStatusDto,
  ): Promise<AdminUserDto> {
    return this.admin.setUserStatus(user.id, id, dto);
  }

  @Get('offers')
  @ApiOperation({ summary: 'Search offers in any status, newest first' })
  @ApiOkResponse({ type: AdminOfferPageDto })
  listOffers(@Query() query: AdminOffersQueryDto): Promise<AdminOfferPageDto> {
    return this.admin.listOffers(query);
  }

  @Post('offers/:id/remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove an offer from the portal, with a reason',
    description: 'Its company is notified and sees the reason.',
  })
  @ApiOkResponse({ type: AdminOfferDto })
  @ApiConflictResponse({
    description: 'The offer is already removed',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  removeOffer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: RemoveOfferDto,
  ): Promise<AdminOfferDto> {
    return this.admin.removeOffer(user.id, id, dto);
  }

  @Post('offers/:id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restore a removed offer',
    description:
      'It goes back to closed if its company had closed it, open otherwise.',
  })
  @ApiOkResponse({ type: AdminOfferDto })
  @ApiConflictResponse({
    description: 'The offer is not removed',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  restoreOffer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: RestoreOfferDto,
  ): Promise<AdminOfferDto> {
    return this.admin.restoreOffer(user.id, id, dto);
  }

  @Get('actions')
  @ApiOperation({ summary: 'Log of moderation actions, newest first' })
  @ApiOkResponse({ type: AdminActionPageDto })
  listActions(@Query() query: AdminPageQueryDto): Promise<AdminActionPageDto> {
    return this.admin.listActions(query);
  }
}
