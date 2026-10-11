import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { UserRole } from '../../generated/prisma/enums.js';
import {
  StudentProfileResponseDto,
  StudentProfileViewDto,
} from './dto/student-profile-response.dto.js';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto.js';
import { StudentsService } from './students.service.js';

@ApiTags('students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('me')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get the profile of the authenticated student' })
  @ApiOkResponse({ type: StudentProfileResponseDto })
  getOwnProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StudentProfileResponseDto> {
    return this.studentsService.getOwnProfile(user.id);
  }

  @Patch('me')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Update the profile of the authenticated student',
    description:
      'Only the fields sent are changed. Nullable fields are cleared with null.',
  })
  @ApiOkResponse({ type: StudentProfileResponseDto })
  @ApiBadRequestResponse({
    description: 'Validation failed',
    type: ErrorResponseDto,
  })
  updateOwnProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateStudentProfileDto,
  ): Promise<StudentProfileResponseDto> {
    return this.studentsService.updateOwnProfile(user.id, dto);
  }

  @Get(':id')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get the profile of a student',
    description:
      'Available to administrators, and to an employer only for students ' +
      "who applied to one of its company's offers.",
  })
  @ApiOkResponse({ type: StudentProfileViewDto })
  @ApiForbiddenResponse({
    description: 'The student has not applied to any offer of this company',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ): Promise<StudentProfileViewDto> {
    return this.studentsService.getProfileForViewer(id, viewer);
  }
}
