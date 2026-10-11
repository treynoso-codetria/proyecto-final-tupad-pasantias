import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
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
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { ParseIdPipe } from '../../common/validation/ids.js';
import { UserRole } from '../../generated/prisma/enums.js';
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
