import {
  applyDecorators,
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
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
import { CreateOfferDto } from './dto/create-offer.dto.js';
import { ListOffersQueryDto } from './dto/list-offers-query.dto.js';
import { MyOffersQueryDto } from './dto/my-offers-query.dto.js';
import {
  MyOfferDto,
  OfferDetailDto,
  OfferPageDto,
} from './dto/offer-response.dto.js';
import { UpdateOfferDto } from './dto/update-offer.dto.js';
import { OffersService } from './offers.service.js';

// Errors of the endpoints that change an offer of the employer.
const ApiOwnOfferErrors = () =>
  applyDecorators(
    ApiForbiddenResponse({
      description: 'The offer belongs to another company',
      type: ErrorResponseDto,
    }),
    ApiNotFoundResponse({ type: ErrorResponseDto }),
    ApiConflictResponse({
      description: 'The offer is not open (closed or removed)',
      type: ErrorResponseDto,
    }),
  );

@ApiTags('offers')
@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Search the offers students can apply to',
    description:
      'Open offers with no deadline or one that has not passed, from active ' +
      'companies. Filters combine with AND; several tags match offers with ' +
      'any of them.',
  })
  @ApiOkResponse({ type: OfferPageDto })
  @ApiBadRequestResponse({
    description: 'Invalid filter',
    type: ErrorResponseDto,
  })
  listPublic(@Query() query: ListOffersQueryDto): Promise<OfferPageDto> {
    return this.offersService.listPublic(query);
  }

  // Declared before ':id' so that "mine" is not read as an id.
  @Get('mine')
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List the authenticated employer's offers, in every status",
  })
  @ApiOkResponse({ type: [MyOfferDto] })
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MyOffersQueryDto,
  ): Promise<MyOfferDto[]> {
    return this.offersService.listMine(user.id, query.status);
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Get an offer with its company',
    description:
      'Open and closed offers are public. Removed offers, and offers of a ' +
      'deactivated company, are only visible to that company (send its ' +
      'token) and to administrators.',
  })
  @ApiOkResponse({ type: OfferDetailDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getDetail(
    @Param('id', ParseIdPipe) id: string,
    @CurrentUser() viewer: AuthenticatedUser | undefined,
  ): Promise<OfferDetailDto> {
    return this.offersService.getDetail(id, viewer);
  }

  @Post()
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish an offer' })
  @ApiCreatedResponse({ type: OfferDetailDto })
  @ApiBadRequestResponse({
    description:
      'Validation failed, unavailable category, unknown tag, missing ' +
      'province or invalid salary range',
    type: ErrorResponseDto,
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOfferDto,
  ): Promise<OfferDetailDto> {
    return this.offersService.create(user.id, dto);
  }

  @Patch(':id')
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Edit an open offer of the authenticated employer',
    description:
      'Only the fields sent change. Sending tagIds replaces all the tags.',
  })
  @ApiOkResponse({ type: OfferDetailDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiOwnOfferErrors()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: UpdateOfferDto,
  ): Promise<OfferDetailDto> {
    return this.offersService.update(user.id, id, dto);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Close an open offer',
    description:
      'Stops new applications. It cannot be reopened; the offer and its ' +
      'applications are kept.',
  })
  @ApiOkResponse({ type: OfferDetailDto })
  @ApiOwnOfferErrors()
  close(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIdPipe) id: string,
  ): Promise<OfferDetailDto> {
    return this.offersService.close(user.id, id);
  }
}
