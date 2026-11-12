import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../../common/errors/error-code.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  AdminActionType,
  ApplicationStatus,
  NotificationType,
  OfferStatus,
  UserRole,
} from '../../generated/prisma/enums.js';
import { MailService } from '../../mail/mail.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import {
  AdminOffersQueryDto,
  AdminPageQueryDto,
  AdminUsersQueryDto,
} from './dto/admin-query.dto.js';
import {
  AdminActionDto,
  AdminActionPageDto,
  AdminOfferDto,
  AdminOfferPageDto,
  AdminStatsDto,
  AdminUserDto,
  AdminUserPageDto,
} from './dto/admin-response.dto.js';
import {
  RemoveOfferDto,
  RestoreOfferDto,
  SetUserStatusDto,
} from './dto/moderation.dto.js';

const userInclude = {
  studentProfile: { select: { id: true, firstName: true, lastName: true } },
  company: { select: { id: true, name: true } },
} satisfies Prisma.UserInclude;

type UserWithProfile = Prisma.UserGetPayload<{ include: typeof userInclude }>;

const offerInclude = {
  company: {
    select: { id: true, name: true, user: { select: { isActive: true } } },
  },
  category: { select: { id: true, name: true, slug: true } },
  _count: {
    select: {
      applications: {
        where: { status: { not: ApplicationStatus.WITHDRAWN } },
      },
    },
  },
} satisfies Prisma.JobOfferInclude;

type OfferWithCompany = Prisma.JobOfferGetPayload<{
  include: typeof offerInclude;
}>;

const actionInclude = {
  admin: { select: { id: true, email: true } },
  targetUser: { include: userInclude },
  targetOffer: { select: { id: true, title: true } },
} satisfies Prisma.AdminActionInclude;

// Administration and moderation (M11): metrics, activation and deactivation
// of accounts, removal and restoration of offers. Every change is recorded in
// admin_actions and notified to whoever it affects, in the same transaction.
//
// Deactivating an account does not change its data: the rest of the API
// already hides inactive accounts (login and tokens are rejected, the offers
// of an inactive company are not listed nor accept applications), so
// reactivating it brings everything back as it was.
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
  ) {}

  async getStats(): Promise<AdminStatsDto> {
    const [users, offers, applications] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['role', 'isActive'],
        where: { role: { in: [UserRole.STUDENT, UserRole.EMPLOYER] } },
        _count: { _all: true },
      }),
      this.prisma.jobOffer.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.application.groupBy({
        by: ['status'],
        where: { status: { not: ApplicationStatus.WITHDRAWN } },
        _count: { _all: true },
      }),
    ]);

    const accounts = (role: UserRole) => {
      const rows = users.filter((row) => row.role === role);
      return {
        total: rows.reduce((sum, row) => sum + row._count._all, 0),
        active: rows
          .filter((row) => row.isActive)
          .reduce((sum, row) => sum + row._count._all, 0),
      };
    };
    const offersWith = (status: OfferStatus) =>
      offers.find((row) => row.status === status)?._count._all ?? 0;
    const applicationsWith = (status: ApplicationStatus) =>
      applications.find((row) => row.status === status)?._count._all ?? 0;

    return {
      students: accounts(UserRole.STUDENT),
      companies: accounts(UserRole.EMPLOYER),
      offers: {
        open: offersWith(OfferStatus.OPEN),
        closed: offersWith(OfferStatus.CLOSED),
        removed: offersWith(OfferStatus.REMOVED),
      },
      applications: {
        total: applications.reduce((sum, row) => sum + row._count._all, 0),
        pending: applicationsWith(ApplicationStatus.PENDING),
        accepted: applicationsWith(ApplicationStatus.ACCEPTED),
        rejected: applicationsWith(ApplicationStatus.REJECTED),
      },
    };
  }

  async listUsers(query: AdminUsersQueryDto): Promise<AdminUserPageDto> {
    const filters: Prisma.UserWhereInput[] = [
      { role: query.role ?? { in: [UserRole.STUDENT, UserRole.EMPLOYER] } },
    ];
    if (query.status) {
      filters.push({ isActive: query.status === 'active' });
    }
    if (query.q) {
      const contains = { contains: query.q, mode: 'insensitive' as const };
      // "Ana Gómez" matches a student whose first and last names together
      // contain every word.
      const words = query.q.split(/\s+/).filter(Boolean);
      filters.push({
        OR: [
          { email: contains },
          { company: { name: contains } },
          { company: { cuit: contains } },
          {
            studentProfile: {
              AND: words.map((word) => ({
                OR: [
                  { firstName: { contains: word, mode: 'insensitive' } },
                  { lastName: { contains: word, mode: 'insensitive' } },
                ],
              })),
            },
          },
        ],
      });
    }
    const where: Prisma.UserWhereInput = { AND: filters };

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: userInclude,
      }),
    ]);
    return {
      items: users.map(toAdminUser),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async setUserStatus(
    adminId: string,
    userId: string,
    dto: SetUserStatusDto,
  ): Promise<AdminUserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException();
    }
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException(ErrorCode.ADMIN_ACCOUNT_NOT_MANAGEABLE);
    }
    const reason = dto.reason ?? null;

    const updated = await this.prisma.$transaction(async (tx) => {
      // Conditional update: of two concurrent requests, only one changes it.
      const { count } = await tx.user.updateMany({
        where: { id: userId, isActive: !dto.isActive },
        data: { isActive: dto.isActive },
      });
      if (count === 0) {
        throw new ConflictException(ErrorCode.ACCOUNT_STATUS_UNCHANGED);
      }
      await tx.adminAction.create({
        data: {
          adminId,
          action: dto.isActive
            ? AdminActionType.USER_ACTIVATED
            : AdminActionType.USER_DEACTIVATED,
          targetUserId: userId,
          reason,
        },
      });
      await this.notifications.notify(
        {
          type: NotificationType.ACCOUNT_STATUS_CHANGED,
          data: dto.isActive
            ? { status: 'ACTIVATED' }
            : { status: 'DEACTIVATED', reason: reason ?? '' },
          userId,
          link: '/account',
        },
        tx,
      );
      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: userInclude,
      });
    });

    // A notice: the change is done even if the email fails.
    await this.mail.sendAccountStatusNotice(user.email, dto.isActive, reason);
    return toAdminUser(updated);
  }

  async listOffers(query: AdminOffersQueryDto): Promise<AdminOfferPageDto> {
    const filters: Prisma.JobOfferWhereInput[] = [];
    if (query.status) {
      filters.push({ status: query.status });
    }
    if (query.q) {
      const contains = { contains: query.q, mode: 'insensitive' as const };
      filters.push({
        OR: [{ title: contains }, { company: { name: contains } }],
      });
    }
    const where: Prisma.JobOfferWhereInput = { AND: filters };

    const [total, offers] = await Promise.all([
      this.prisma.jobOffer.count({ where }),
      this.prisma.jobOffer.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: offerInclude,
      }),
    ]);
    return {
      items: offers.map(toAdminOffer),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  // A removed offer disappears from the portal: it is not listed, cannot be
  // applied to and its conversations are closed. Its company still sees it,
  // with the reason, and cannot edit it.
  async removeOffer(
    adminId: string,
    offerId: string,
    dto: RemoveOfferDto,
  ): Promise<AdminOfferDto> {
    const offer = await this.findOffer(offerId);
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.jobOffer.updateMany({
        where: { id: offerId, status: { not: OfferStatus.REMOVED } },
        data: {
          status: OfferStatus.REMOVED,
          removedAt: new Date(),
          removedById: adminId,
          removalReason: dto.reason,
        },
      });
      if (count === 0) {
        throw new ConflictException(ErrorCode.OFFER_ALREADY_REMOVED);
      }
      await tx.adminAction.create({
        data: {
          adminId,
          action: AdminActionType.OFFER_REMOVED,
          targetOfferId: offerId,
          reason: dto.reason,
        },
      });
      await this.notifications.notify(
        {
          type: NotificationType.OFFER_REMOVED,
          data: {
            offerId,
            offerTitle: offer.title,
            status: 'REMOVED',
            reason: dto.reason,
          },
          userId: offer.company.userId,
          link: `/offers/${offerId}`,
        },
        tx,
      );
      return toAdminOffer(
        await tx.jobOffer.findUniqueOrThrow({
          where: { id: offerId },
          include: offerInclude,
        }),
      );
    });
  }

  // The offer goes back to the status it had: closed if its company had
  // closed it before the removal, open otherwise.
  async restoreOffer(
    adminId: string,
    offerId: string,
    dto: RestoreOfferDto,
  ): Promise<AdminOfferDto> {
    const offer = await this.findOffer(offerId);
    const reason = dto.reason ?? null;
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.jobOffer.updateMany({
        where: { id: offerId, status: OfferStatus.REMOVED },
        data: {
          status: offer.closedAt ? OfferStatus.CLOSED : OfferStatus.OPEN,
          removedAt: null,
          removedById: null,
          removalReason: null,
        },
      });
      if (count === 0) {
        throw new ConflictException(ErrorCode.OFFER_NOT_REMOVED);
      }
      await tx.adminAction.create({
        data: {
          adminId,
          action: AdminActionType.OFFER_RESTORED,
          targetOfferId: offerId,
          reason,
        },
      });
      await this.notifications.notify(
        {
          type: NotificationType.OFFER_REMOVED,
          data: { offerId, offerTitle: offer.title, status: 'RESTORED' },
          userId: offer.company.userId,
          link: `/offers/${offerId}`,
        },
        tx,
      );
      return toAdminOffer(
        await tx.jobOffer.findUniqueOrThrow({
          where: { id: offerId },
          include: offerInclude,
        }),
      );
    });
  }

  async listActions(query: AdminPageQueryDto): Promise<AdminActionPageDto> {
    const [total, actions] = await Promise.all([
      this.prisma.adminAction.count(),
      this.prisma.adminAction.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: actionInclude,
      }),
    ]);
    return {
      items: actions.map(toAdminAction),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  private async findOffer(offerId: string) {
    const offer = await this.prisma.jobOffer.findUnique({
      where: { id: offerId },
      select: {
        title: true,
        closedAt: true,
        company: { select: { userId: true } },
      },
    });
    if (!offer) {
      throw new NotFoundException();
    }
    return offer;
  }
}

function displayName(user: UserWithProfile): string {
  if (user.studentProfile) {
    return `${user.studentProfile.firstName} ${user.studentProfile.lastName}`;
  }
  return user.company?.name ?? user.email;
}

function toAdminUser(user: UserWithProfile): AdminUserDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: displayName(user),
    studentId: user.studentProfile?.id ?? null,
    companyId: user.company?.id ?? null,
    isActive: user.isActive,
    emailVerified: user.emailVerifiedAt !== null,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

function toAdminOffer(offer: OfferWithCompany): AdminOfferDto {
  return {
    id: offer.id,
    title: offer.title,
    status: offer.status,
    company: {
      id: offer.company.id,
      name: offer.company.name,
      isActive: offer.company.user.isActive,
    },
    category: offer.category,
    applicationsCount: offer._count.applications,
    publishedAt: offer.publishedAt,
    closedAt: offer.closedAt,
    removedAt: offer.removedAt,
    removalReason: offer.removalReason,
  };
}

function toAdminAction(
  action: Prisma.AdminActionGetPayload<{ include: typeof actionInclude }>,
): AdminActionDto {
  return {
    id: action.id,
    action: action.action,
    reason: action.reason,
    createdAt: action.createdAt,
    admin: action.admin,
    targetUser: action.targetUser && {
      id: action.targetUser.id,
      email: action.targetUser.email,
      name: displayName(action.targetUser),
    },
    targetOffer: action.targetOffer,
  };
}
