import {
  applyDecorators,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { ParseIdPipe } from '../../common/validation/ids.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { AdminCatalogService } from './admin-catalog.service.js';
import {
  AdminCategoryDto,
  AdminTagDto,
  CreateCategoryDto,
  TagNameDto,
  UpdateCategoryDto,
} from './dto/admin-catalog.dto.js';

// Errors of the endpoints that create or rename a category or tag.
const ApiNameErrors = () =>
  applyDecorators(
    ApiBadRequestResponse({
      description: 'Validation failed, or the name has no letters or digits',
      type: ErrorResponseDto,
    }),
    ApiConflictResponse({
      description: 'Another item already has that name (or one equivalent)',
      type: ErrorResponseDto,
    }),
  );

@ApiTags('admin: catalog')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminCatalogController {
  constructor(private readonly catalog: AdminCatalogService) {}

  @Get('categories')
  @ApiOperation({
    summary: 'List every category, active or not, with its offer count',
  })
  @ApiOkResponse({ type: [AdminCategoryDto] })
  listCategories(): Promise<AdminCategoryDto[]> {
    return this.catalog.listCategories();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a category; its slug comes from the name' })
  @ApiCreatedResponse({ type: AdminCategoryDto })
  @ApiNameErrors()
  createCategory(@Body() dto: CreateCategoryDto): Promise<AdminCategoryDto> {
    return this.catalog.createCategory(dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Rename, activate or deactivate a category' })
  @ApiOkResponse({ type: AdminCategoryDto })
  @ApiNameErrors()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  updateCategory(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<AdminCategoryDto> {
    return this.catalog.updateCategory(id, dto);
  }

  @Get('tags')
  @ApiOperation({ summary: 'List every tag with its offer count' })
  @ApiOkResponse({ type: [AdminTagDto] })
  listTags(): Promise<AdminTagDto[]> {
    return this.catalog.listTags();
  }

  @Post('tags')
  @ApiOperation({ summary: 'Create a tag; its slug comes from the name' })
  @ApiCreatedResponse({ type: AdminTagDto })
  @ApiNameErrors()
  createTag(@Body() dto: TagNameDto): Promise<AdminTagDto> {
    return this.catalog.createTag(dto);
  }

  @Patch('tags/:id')
  @ApiOperation({ summary: 'Rename a tag' })
  @ApiOkResponse({ type: AdminTagDto })
  @ApiNameErrors()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  renameTag(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: TagNameDto,
  ): Promise<AdminTagDto> {
    return this.catalog.renameTag(id, dto);
  }

  @Delete('tags/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a tag',
    description: 'The offers that had it lose it.',
  })
  @ApiNoContentResponse({ description: 'Tag deleted' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  deleteTag(@Param('id', ParseIdPipe) id: string): Promise<void> {
    return this.catalog.deleteTag(id);
  }
}
