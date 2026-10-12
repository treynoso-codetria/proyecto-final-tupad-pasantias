import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Put,
  Redirect,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiFoundResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { ParseIdPipe } from '../../common/validation/ids.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { UploadedFile as UploadedFileData } from '../../storage/file-types.js';
import { FileUpload, UPLOAD_RULES } from '../../storage/uploads.js';
import { CompaniesService } from './companies.service.js';
import {
  CompanyResponseDto,
  PublicCompanyResponseDto,
} from './dto/company-response.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';

@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('me')
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the company of the authenticated employer' })
  @ApiOkResponse({ type: CompanyResponseDto })
  getOwnCompany(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompanyResponseDto> {
    return this.companiesService.getOwnCompany(user.id);
  }

  @Patch('me')
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update the company of the authenticated employer',
    description:
      'Only the fields sent are changed. Nullable fields are cleared with null.',
  })
  @ApiOkResponse({ type: CompanyResponseDto })
  @ApiBadRequestResponse({
    description: 'Validation failed',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'CUIT is already registered by another company',
    type: ErrorResponseDto,
  })
  updateOwnCompany(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCompanyDto,
  ): Promise<CompanyResponseDto> {
    return this.companiesService.updateOwnCompany(user.id, dto);
  }

  @Put('me/logo')
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload or replace the logo of the authenticated employer',
    description: 'The previous logo is deleted.',
  })
  @FileUpload(UPLOAD_RULES.logo, 'The logo, a PNG, JPG or WebP of up to 2 MB')
  @ApiOkResponse({ type: CompanyResponseDto })
  @ApiBadRequestResponse({ description: 'No file', type: ErrorResponseDto })
  uploadLogo(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: UploadedFileData | undefined,
  ): Promise<CompanyResponseDto> {
    return this.companiesService.uploadLogo(user.id, file);
  }

  @Delete('me/logo')
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete the logo of the authenticated employer' })
  @ApiOkResponse({ type: CompanyResponseDto })
  deleteLogo(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompanyResponseDto> {
    return this.companiesService.deleteLogo(user.id);
  }

  // Declared after 'me' so that "me" is not read as an id.
  @Public()
  @Get(':id/logo')
  @Redirect()
  // The signed link it redirects to works for at least an hour.
  @Header('Cache-Control', 'public, max-age=600')
  @ApiOperation({
    summary: 'Get the logo of a company',
    description:
      'Redirects to a temporary link to the image. This is the `logoUrl` ' +
      'returned with companies and offers.',
  })
  @ApiFoundResponse({ description: 'Redirect to the image' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async getLogo(
    @Param('id', ParseIdPipe) id: string,
  ): Promise<{ url: string }> {
    return { url: await this.companiesService.getLogoUrl(id) };
  }

  // Declared after 'me' so that "me" is not read as an id.
  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Get the public page of a company',
    description: 'Public data of the company and its currently open offers.',
  })
  @ApiOkResponse({ type: PublicCompanyResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getPublicCompany(
    @Param('id', ParseIdPipe) id: string,
  ): Promise<PublicCompanyResponseDto> {
    return this.companiesService.getPublicCompany(id);
  }
}
