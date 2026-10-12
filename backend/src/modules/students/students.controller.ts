import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  UploadedFile,
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
import { ParseIdPipe } from '../../common/validation/ids.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { UploadedFile as UploadedFileData } from '../../storage/file-types.js';
import { FileUpload, UPLOAD_RULES } from '../../storage/uploads.js';
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

  @Put('me/cv')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Upload or replace the CV of the authenticated student',
    description:
      'The previous CV is deleted, unless an application still uses it ' +
      '(a company keeps seeing the CV the student applied with).',
  })
  @FileUpload(UPLOAD_RULES.cv, 'The CV, a PDF of up to 5 MB')
  @ApiOkResponse({ type: StudentProfileResponseDto })
  @ApiBadRequestResponse({ description: 'No file', type: ErrorResponseDto })
  uploadCv(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: UploadedFileData | undefined,
  ): Promise<StudentProfileResponseDto> {
    return this.studentsService.uploadCv(user.id, file);
  }

  @Delete('me/cv')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Delete the CV of the authenticated student' })
  @ApiOkResponse({ type: StudentProfileResponseDto })
  deleteCv(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StudentProfileResponseDto> {
    return this.studentsService.deleteCv(user.id);
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
    @Param('id', ParseIdPipe) id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ): Promise<StudentProfileViewDto> {
    return this.studentsService.getProfileForViewer(id, viewer);
  }
}
