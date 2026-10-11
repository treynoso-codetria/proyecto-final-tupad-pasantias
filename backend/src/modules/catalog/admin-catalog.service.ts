import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../../common/errors/error-code.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  AdminCategoryDto,
  AdminTagDto,
  CreateCategoryDto,
  TagNameDto,
  UpdateCategoryDto,
} from './dto/admin-catalog.dto.js';
import { slugify } from './slugify.js';

const withOfferCount = { _count: { select: { offers: true } } } as const;

// Management of categories and tags (M6), for administrators. Two items
// cannot have names that lead to the same slug ("React" and "react"), since
// the slug identifies them in the offer filters.
@Injectable()
export class AdminCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories(): Promise<AdminCategoryDto[]> {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: withOfferCount,
    });
    return categories.map(toAdminCategory);
  }

  async createCategory(dto: CreateCategoryDto): Promise<AdminCategoryDto> {
    const slug = slugFor(dto.name);
    await this.assertCategorySlugFree(slug);
    const category = await this.saveUnique(
      () =>
        this.prisma.category.create({
          data: { name: dto.name, slug },
          include: withOfferCount,
        }),
      ErrorCode.CATEGORY_NAME_TAKEN,
    );
    return toAdminCategory(category);
  }

  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<AdminCategoryDto> {
    await this.findCategory(id);
    const slug = dto.name !== undefined ? slugFor(dto.name) : undefined;
    if (slug !== undefined) {
      await this.assertCategorySlugFree(slug, id);
    }
    const category = await this.saveUnique(
      () =>
        this.prisma.category.update({
          where: { id },
          data: { name: dto.name, slug, isActive: dto.isActive },
          include: withOfferCount,
        }),
      ErrorCode.CATEGORY_NAME_TAKEN,
    );
    return toAdminCategory(category);
  }

  async listTags(): Promise<AdminTagDto[]> {
    const tags = await this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: withOfferCount,
    });
    return tags.map(toAdminTag);
  }

  async createTag(dto: TagNameDto): Promise<AdminTagDto> {
    const slug = slugFor(dto.name);
    await this.assertTagSlugFree(slug);
    const tag = await this.saveUnique(
      () =>
        this.prisma.tag.create({
          data: { name: dto.name, slug },
          include: withOfferCount,
        }),
      ErrorCode.TAG_NAME_TAKEN,
    );
    return toAdminTag(tag);
  }

  async renameTag(id: string, dto: TagNameDto): Promise<AdminTagDto> {
    await this.findTag(id);
    const slug = slugFor(dto.name);
    await this.assertTagSlugFree(slug, id);
    const tag = await this.saveUnique(
      () =>
        this.prisma.tag.update({
          where: { id },
          data: { name: dto.name, slug },
          include: withOfferCount,
        }),
      ErrorCode.TAG_NAME_TAKEN,
    );
    return toAdminTag(tag);
  }

  // Tags have no "inactive" state, so they can be deleted: the offers that
  // had it simply lose it (job_offer_tags rows cascade). Categories cannot be
  // deleted, only deactivated, because every offer needs one.
  async deleteTag(id: string): Promise<void> {
    await this.findTag(id);
    await this.prisma.tag.delete({ where: { id } });
  }

  private async findCategory(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException();
    }
    return category;
  }

  private async findTag(id: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException();
    }
    return tag;
  }

  private async assertCategorySlugFree(slug: string, exceptId?: string) {
    const owner = await this.prisma.category.findUnique({ where: { slug } });
    if (owner && owner.id !== exceptId) {
      throw new ConflictException(ErrorCode.CATEGORY_NAME_TAKEN);
    }
  }

  private async assertTagSlugFree(slug: string, exceptId?: string) {
    const owner = await this.prisma.tag.findUnique({ where: { slug } });
    if (owner && owner.id !== exceptId) {
      throw new ConflictException(ErrorCode.TAG_NAME_TAKEN);
    }
  }

  // The checks above leave a gap for two concurrent requests; the unique
  // constraints on name and slug close it.
  private async saveUnique<T>(save: () => Promise<T>, code: ErrorCode) {
    try {
      return await save();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(code);
      }
      throw error;
    }
  }
}

function slugFor(name: string): string {
  const slug = slugify(name);
  if (!slug) {
    throw new BadRequestException(ErrorCode.CATALOG_NAME_INVALID);
  }
  return slug;
}

type WithCount = { _count: { offers: number } };

function toAdminCategory(
  category: Prisma.CategoryGetPayload<object> & WithCount,
): AdminCategoryDto {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    isActive: category.isActive,
    offersCount: category._count.offers,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

function toAdminTag(
  tag: Prisma.TagGetPayload<object> & WithCount,
): AdminTagDto {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    offersCount: tag._count.offers,
    createdAt: tag.createdAt,
  };
}
