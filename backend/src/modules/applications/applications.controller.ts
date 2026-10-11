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
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
import { ApplicationsService } from './applications.service.js';
import {
  ApplicantDto,
  ApplicantsQueryDto,
  ApplicationDto,
  ApplyDto,
  DecideApplicationDto,
  MyApplicationDto,
  StudentApplicationsQueryDto,
} from './dto/application.dto.js';

@ApiTags('applications')
@ApiBearerAuth()
@Controller()
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Post('offers/:offerId/applications')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Apply to an offer',
    description:
      'The offer must be open with its deadline not passed. A student who ' +
      'withdrew an application can apply again.',
  })
  @ApiCreatedResponse({ type: ApplicationDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'Already applied, or the offer no longer accepts applications',
    type: ErrorResponseDto,
  })
  apply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('offerId', ParseIdPipe) offerId: string,
    @Body() dto: ApplyDto,
  ): Promise<ApplicationDto> {
    return this.applications.apply(user.id, offerId, dto);
  }

  @Get('applications/mine')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: "List the authenticated student's applications" })
  @ApiOkResponse({ type: [MyApplicationDto] })
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: StudentApplicationsQueryDto,
  ): Promise<MyApplicationDto[]> {
    return this.applications.listMine(user.id, query.status);
  }

  @Post('applications/:id/withdraw')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Withdraw a pending application' })
  @ApiOkResponse({ type: ApplicationDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'The application is not pending',
    type: ErrorResponseDto,
  })
  withdraw(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIdPipe) id: string,
  ): Promise<ApplicationDto> {
    return this.applications.withdraw(user.id, id);
  }

  @Get('offers/:offerId/applications')
  @Roles(UserRole.EMPLOYER)
  @ApiOperation({
    summary: "List the applicants of one of the employer's offers",
    description: 'Withdrawn applications are not included.',
  })
  @ApiOkResponse({ type: [ApplicantDto] })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  listApplicants(
    @CurrentUser() user: AuthenticatedUser,
    @Param('offerId', ParseIdPipe) offerId: string,
    @Query() query: ApplicantsQueryDto,
  ): Promise<ApplicantDto[]> {
    return this.applications.listApplicants(user.id, offerId, query.status);
  }

  @Patch('applications/:id/status')
  @Roles(UserRole.EMPLOYER)
  @ApiOperation({
    summary: 'Accept or reject an application',
    description:
      'The answer can be changed later; every change notifies the student.',
  })
  @ApiOkResponse({ type: ApplicationDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'The student withdrew the application',
    type: ErrorResponseDto,
  })
  decide(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: DecideApplicationDto,
  ): Promise<ApplicationDto> {
    return this.applications.decide(user.id, id, dto.status);
  }
}
