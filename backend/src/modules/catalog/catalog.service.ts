import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CatalogItemDto } from './dto/catalog-item.dto.js';

const catalogFields = { id: true, name: true, slug: true } as const;

// Read side of M6. Creating and editing categories and tags is reserved to
// administrators and arrives with that module.
@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // Inactive categories are not offered for new offers nor as filters.
  listCategories(): Promise<CatalogItemDto[]> {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: catalogFields,
    });
  }

  listTags(): Promise<CatalogItemDto[]> {
    return this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
      select: catalogFields,
    });
  }
}
