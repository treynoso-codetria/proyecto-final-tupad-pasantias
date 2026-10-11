import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { CatalogService } from './catalog.service.js';
import { CatalogItemDto } from './dto/catalog-item.dto.js';

@ApiTags('catalog')
@Public()
@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  @ApiOperation({ summary: 'List the active offer categories' })
  @ApiOkResponse({ type: [CatalogItemDto] })
  listCategories(): Promise<CatalogItemDto[]> {
    return this.catalogService.listCategories();
  }

  @Get('tags')
  @ApiOperation({ summary: 'List the offer tags' })
  @ApiOkResponse({ type: [CatalogItemDto] })
  listTags(): Promise<CatalogItemDto[]> {
    return this.catalogService.listTags();
  }
}
