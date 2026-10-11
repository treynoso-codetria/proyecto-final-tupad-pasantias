import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { toIsoDate } from '../../common/dates.js';
import { ErrorCode } from '../../common/errors/error-code.js';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  ApplicationStatus,
  OfferStatus,
  UserRole,
  WorkModality,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateOfferDto } from './dto/create-offer.dto.js';
import { ListOffersQueryDto } from './dto/list-offers-query.dto.js';
import {
  MyOfferDto,
  OfferDetailDto,
  OfferPageDto,
  OfferSummaryDto,
} from './dto/offer-response.dto.js';
import { UpdateOfferDto } from './dto/update-offer.dto.js';
import {
  acceptingApplications,
  acceptsApplications,
} from './offer-availability.js';

const catalogFields = { id: true, name: true, slug: true } as const;

const summaryInclude = {
  company: { select: { id: true, name: true, logoUrl: true } },
  category: { select: catalogFields },
  tags: {
    select: { tag: { select: catalogFields } },
    orderBy: { tag: { name: 'asc' } },
  },
} satisfies Prisma.JobOfferInclude;

const detailInclude = {
  ...summaryInclude,
  company: {
    select: {
      id: true,
      name: true,
      logoUrl: true,
      industry: true,
      description: true,
      website: true,
      province: true,
      city: true,
      userId: true,
      user: { select: { isActive: true } },
    },
  },
} satisfies Prisma.JobOfferInclude;

type OfferWithSummary = Prisma.JobOfferGetPayload<{
  include: typeof summaryInclude;
}>;
type OfferWithDetail = Prisma.JobOfferGetPayload<{
  include: typeof detailInclude;
}>;

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(query: ListOffersQueryDto): Promise<OfferPageDto> {
    const filters: Prisma.JobOfferWhereInput[] = [acceptingApplications()];
    if (query.q) {
      filters.push({
        OR: [
          { title: { contains: query.q, mode: 'insensitive' } },
          { description: { contains: query.q, mode: 'insensitive' } },
        ],
      });
    }
    if (query.category) {
      filters.push({ category: { slug: query.category } });
    }
    if (query.tags?.length) {
      filters.push({
        tags: { some: { tag: { slug: { in: query.tags } } } },
      });
    }
    for (const field of ['type', 'modality', 'workload', 'province'] as const) {
      if (query[field]) {
        filters.push({ [field]: query[field] });
      }
    }
    const where: Prisma.JobOfferWhereInput = { AND: filters };

    // The id breaks ties, so pages do not overlap between requests.
    const orderBy: Prisma.JobOfferOrderByWithRelationInput[] =
      query.sort === 'deadline'
        ? [
            { deadline: { sort: 'asc', nulls: 'last' } },
            { publishedAt: 'desc' },
            { id: 'asc' },
          ]
        : [{ publishedAt: 'desc' }, { id: 'asc' }];

    // Two independent queries in parallel (each on its own connection): a
    // count that is a moment off from the page does no harm here.
    const [total, offers] = await Promise.all([
      this.prisma.jobOffer.count({ where }),
      this.prisma.jobOffer.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: summaryInclude,
      }),
    ]);

    return {
      items: offers.map(toSummary),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  // Open and closed offers can be read by anyone with the link (a closed
  // offer still matters to those who applied). A removed offer, or one from
  // a deactivated company, only by that company and by administrators.
  async getDetail(
    offerId: string,
    viewer: AuthenticatedUser | undefined,
  ): Promise<OfferDetailDto> {
    const offer = await this.prisma.jobOffer.findUnique({
      where: { id: offerId },
      include: detailInclude,
    });
    if (!offer) {
      throw new NotFoundException();
    }

    const privileged =
      viewer?.role === UserRole.ADMIN ||
      (viewer?.role === UserRole.EMPLOYER &&
        offer.company.userId === viewer.id);
    const hidden =
      offer.status === OfferStatus.REMOVED || !offer.company.user.isActive;
    if (hidden && !privileged) {
      throw new NotFoundException();
    }

    // A student sees whether (and how) they already applied.
    const myApplication =
      viewer?.role === UserRole.STUDENT
        ? await this.prisma.application.findFirst({
            where: { offerId, student: { userId: viewer.id } },
            select: { id: true, status: true, appliedAt: true },
          })
        : null;

    return { ...toDetail(offer, privileged), myApplication };
  }

  async listMine(
    userId: string,
    status: OfferStatus | undefined,
  ): Promise<MyOfferDto[]> {
    const offers = await this.prisma.jobOffer.findMany({
      where: { company: { userId }, status },
      orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
      include: summaryInclude,
    });

    const counts = await this.prisma.application.groupBy({
      by: ['offerId', 'status'],
      where: {
        offerId: { in: offers.map((offer) => offer.id) },
        status: { not: ApplicationStatus.WITHDRAWN },
      },
      _count: { _all: true },
    });
    const countFor = (offerId: string, onlyPending: boolean) =>
      counts
        .filter(
          (row) =>
            row.offerId === offerId &&
            (!onlyPending || row.status === ApplicationStatus.PENDING),
        )
        .reduce((sum, row) => sum + row._count._all, 0);

    return offers.map((offer) => ({
      ...toSummary(offer),
      applicationsCount: countFor(offer.id, false),
      pendingApplicationsCount: countFor(offer.id, true),
      closedAt: offer.closedAt,
      removalReason: offer.removalReason,
    }));
  }

  async create(userId: string, dto: CreateOfferDto): Promise<OfferDetailDto> {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { userId },
      select: { id: true },
    });
    await this.assertCategoryAvailable(dto.categoryId);
    await this.assertTagsExist(dto.tagIds);
    assertConsistent({
      modality: dto.modality,
      province: dto.province ?? null,
      salaryMin: dto.salaryMin ?? null,
      salaryMax: dto.salaryMax ?? null,
    });

    const { tagIds = [], ...fields } = dto;
    const offer = await this.prisma.jobOffer.create({
      data: {
        ...fields,
        companyId: company.id,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
      include: detailInclude,
    });
    return { ...toDetail(offer, true), myApplication: null };
  }

  async update(
    userId: string,
    offerId: string,
    dto: UpdateOfferDto,
  ): Promise<OfferDetailDto> {
    const offer = await this.getOwnOpenOffer(userId, offerId);
    // An offer keeps a category deactivated after it was published, but
    // cannot be moved to one.
    if (dto.categoryId !== undefined && dto.categoryId !== offer.categoryId) {
      await this.assertCategoryAvailable(dto.categoryId);
    }
    await this.assertTagsExist(dto.tagIds);
    assertConsistent({
      modality: dto.modality ?? offer.modality,
      province: dto.province !== undefined ? dto.province : offer.province,
      salaryMin:
        dto.salaryMin !== undefined
          ? dto.salaryMin
          : (offer.salaryMin?.toNumber() ?? null),
      salaryMax:
        dto.salaryMax !== undefined
          ? dto.salaryMax
          : (offer.salaryMax?.toNumber() ?? null),
    });

    const { tagIds, ...fields } = dto;
    const updated = await this.prisma.jobOffer.update({
      where: { id: offerId },
      data: {
        ...fields,
        // Sending tagIds replaces the whole set.
        tags: tagIds && {
          deleteMany: {},
          create: tagIds.map((tagId) => ({ tagId })),
        },
      },
      include: detailInclude,
    });
    return { ...toDetail(updated, true), myApplication: null };
  }

  // Closing stops new applications; the offer and its applications are kept.
  async close(userId: string, offerId: string): Promise<OfferDetailDto> {
    await this.getOwnOpenOffer(userId, offerId);
    const closed = await this.prisma.jobOffer.update({
      where: { id: offerId },
      data: { status: OfferStatus.CLOSED, closedAt: new Date() },
      include: detailInclude,
    });
    return { ...toDetail(closed, true), myApplication: null };
  }

  // Only the company that published an offer changes it, and only while it is
  // open: closed offers are final and removed ones are under moderation.
  private async getOwnOpenOffer(userId: string, offerId: string) {
    const offer = await this.prisma.jobOffer.findUnique({
      where: { id: offerId },
      include: { company: { select: { userId: true } } },
    });
    if (!offer) {
      throw new NotFoundException();
    }
    if (offer.company.userId !== userId) {
      throw new ForbiddenException();
    }
    if (offer.status !== OfferStatus.OPEN) {
      throw new ConflictException(ErrorCode.OFFER_NOT_OPEN);
    }
    return offer;
  }

  private async assertCategoryAvailable(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, isActive: true },
      select: { id: true },
    });
    if (!category) {
      throw new BadRequestException(ErrorCode.CATEGORY_NOT_AVAILABLE);
    }
  }

  private async assertTagsExist(tagIds: string[] | undefined): Promise<void> {
    if (!tagIds?.length) {
      return;
    }
    const found = await this.prisma.tag.count({
      where: { id: { in: tagIds } },
    });
    if (found !== tagIds.length) {
      throw new BadRequestException(ErrorCode.TAG_NOT_FOUND);
    }
  }
}

// Rules that involve several fields, checked on the final state of the offer.
function assertConsistent(offer: {
  modality: WorkModality;
  province: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
}): void {
  if (offer.modality !== WorkModality.REMOTE && !offer.province) {
    throw new BadRequestException(ErrorCode.OFFER_LOCATION_REQUIRED);
  }
  if (
    offer.salaryMin !== null &&
    offer.salaryMax !== null &&
    offer.salaryMin > offer.salaryMax
  ) {
    throw new BadRequestException(ErrorCode.SALARY_RANGE_INVALID);
  }
}

function toSummary(offer: OfferWithSummary): OfferSummaryDto {
  return {
    id: offer.id,
    title: offer.title,
    type: offer.type,
    modality: offer.modality,
    workload: offer.workload,
    province: offer.province,
    city: offer.city,
    salaryMin: offer.salaryMin?.toNumber() ?? null,
    salaryMax: offer.salaryMax?.toNumber() ?? null,
    status: offer.status,
    publishedAt: offer.publishedAt,
    deadline: toIsoDate(offer.deadline),
    company: {
      id: offer.company.id,
      name: offer.company.name,
      logoUrl: offer.company.logoUrl,
    },
    category: offer.category,
    tags: offer.tags.map(({ tag }) => tag),
  };
}

function toDetail(
  offer: OfferWithDetail,
  privileged: boolean,
): Omit<OfferDetailDto, 'myApplication'> {
  const { company } = offer;
  return {
    ...toSummary(offer),
    description: offer.description,
    requirements: offer.requirements,
    vacancies: offer.vacancies,
    closedAt: offer.closedAt,
    updatedAt: offer.updatedAt,
    isAcceptingApplications: acceptsApplications(offer),
    removalReason: privileged ? offer.removalReason : null,
    company: {
      id: company.id,
      name: company.name,
      logoUrl: company.logoUrl,
      industry: company.industry,
      description: company.description,
      website: company.website,
      province: company.province,
      city: company.city,
    },
  };
}
