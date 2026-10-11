import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../../common/errors/error-code.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  ApplicationStatus,
  NotificationType,
  OfferStatus,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { acceptsApplications } from '../offers/offer-availability.js';
import {
  ApplicantDto,
  ApplicationDto,
  ApplyDto,
  Decision,
  MyApplicationDto,
  VISIBLE_TO_COMPANY,
} from './dto/application.dto.js';

const applicationFields = {
  id: true,
  offerId: true,
  status: true,
  coverLetter: true,
  cvUrl: true,
  appliedAt: true,
  reviewedAt: true,
} satisfies Prisma.ApplicationSelect;

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // One application per student and offer (unique (offer_id, student_id)).
  // A student who withdrew can apply again: the same application is reopened.
  async apply(
    userId: string,
    offerId: string,
    dto: ApplyDto,
  ): Promise<ApplicationDto> {
    const student = await this.prisma.studentProfile.findUniqueOrThrow({
      where: { userId },
      select: { id: true, firstName: true, lastName: true, cvUrl: true },
    });
    const offer = await this.prisma.jobOffer.findUnique({
      where: { id: offerId },
      include: {
        company: {
          select: { userId: true, user: { select: { isActive: true } } },
        },
      },
    });
    // Offers students cannot see are reported as missing.
    if (
      !offer ||
      offer.status === OfferStatus.REMOVED ||
      !offer.company.user.isActive
    ) {
      throw new NotFoundException();
    }
    if (!acceptsApplications(offer)) {
      throw new ConflictException(ErrorCode.OFFER_NOT_ACCEPTING_APPLICATIONS);
    }

    const existing = await this.prisma.application.findUnique({
      where: { offerId_studentId: { offerId, studentId: student.id } },
      select: { id: true, status: true },
    });
    if (existing && existing.status !== ApplicationStatus.WITHDRAWN) {
      throw new ConflictException(ErrorCode.ALREADY_APPLIED);
    }

    const data = {
      status: ApplicationStatus.PENDING,
      coverLetter: dto.coverLetter ?? null,
      // A copy: the company keeps seeing the CV the student applied with.
      cvUrl: student.cvUrl,
      appliedAt: new Date(),
      reviewedAt: null,
    };

    return this.prisma.$transaction(async (tx) => {
      const application = existing
        ? await tx.application.update({
            where: { id: existing.id },
            data,
            select: applicationFields,
          })
        : await tx.application
            .create({
              data: { ...data, offerId, studentId: student.id },
              select: applicationFields,
            })
            .catch((error: unknown) => {
              // Two requests at once from the same student.
              if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
              ) {
                throw new ConflictException(ErrorCode.ALREADY_APPLIED);
              }
              throw error;
            });

      await this.notifications.notify(
        {
          userId: offer.company.userId,
          type: NotificationType.APPLICATION_RECEIVED,
          title: `New application for "${offer.title}"`,
          body: `${student.firstName} ${student.lastName} applied to your offer.`,
          link: `/employer/offers/${offerId}/applications`,
        },
        tx,
      );
      return application;
    });
  }

  async listMine(
    userId: string,
    status: ApplicationStatus | undefined,
  ): Promise<MyApplicationDto[]> {
    return this.prisma.application.findMany({
      where: { student: { userId }, status },
      orderBy: [{ appliedAt: 'desc' }, { id: 'asc' }],
      select: {
        ...applicationFields,
        offer: {
          select: {
            id: true,
            title: true,
            status: true,
            type: true,
            modality: true,
            province: true,
            city: true,
            company: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  // Only a pending application can be withdrawn: once the company decided,
  // withdrawing would erase that answer.
  async withdraw(
    userId: string,
    applicationId: string,
  ): Promise<ApplicationDto> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { status: true, student: { select: { userId: true } } },
    });
    if (!application) {
      throw new NotFoundException();
    }
    if (application.student.userId !== userId) {
      throw new ForbiddenException();
    }
    if (application.status !== ApplicationStatus.PENDING) {
      throw new ConflictException(ErrorCode.APPLICATION_NOT_PENDING);
    }
    return this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.WITHDRAWN },
      select: applicationFields,
    });
  }

  async listApplicants(
    userId: string,
    offerId: string,
    status: (typeof VISIBLE_TO_COMPANY)[number] | undefined,
  ): Promise<ApplicantDto[]> {
    await this.assertOwnOffer(userId, offerId);
    const applications = await this.prisma.application.findMany({
      where: { offerId, status: status ?? { in: [...VISIBLE_TO_COMPANY] } },
      orderBy: [{ appliedAt: 'asc' }, { id: 'asc' }],
      select: {
        ...applicationFields,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            career: true,
            institution: true,
            studyYear: true,
            province: true,
            city: true,
            user: { select: { email: true } },
          },
        },
      },
    });

    return applications.map(({ student: { user, ...student }, ...rest }) => ({
      ...rest,
      student: { ...student, email: user.email },
    }));
  }

  // The company may change its answer (accepted ↔ rejected); every change
  // is notified to the student. A withdrawn application cannot be answered.
  async decide(
    userId: string,
    applicationId: string,
    decision: Decision,
  ): Promise<ApplicationDto> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        status: true,
        offer: {
          select: {
            id: true,
            title: true,
            company: { select: { userId: true, name: true } },
          },
        },
        student: { select: { userId: true } },
      },
    });
    if (!application) {
      throw new NotFoundException();
    }
    if (application.offer.company.userId !== userId) {
      throw new ForbiddenException();
    }
    if (application.status === ApplicationStatus.WITHDRAWN) {
      throw new ConflictException(ErrorCode.APPLICATION_WITHDRAWN);
    }
    if (application.status === decision) {
      return this.prisma.application.findUniqueOrThrow({
        where: { id: applicationId },
        select: applicationFields,
      });
    }

    const { offer } = application;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: { status: decision, reviewedAt: new Date() },
        select: applicationFields,
      });
      await this.notifications.notify(
        {
          userId: application.student.userId,
          type: NotificationType.APPLICATION_STATUS_CHANGED,
          title:
            decision === ApplicationStatus.ACCEPTED
              ? 'Your application was accepted'
              : 'Your application was not selected',
          body: `${offer.company.name} answered your application to "${offer.title}".`,
          link: '/student/applications',
        },
        tx,
      );
      return updated;
    });
  }

  private async assertOwnOffer(userId: string, offerId: string) {
    const offer = await this.prisma.jobOffer.findUnique({
      where: { id: offerId },
      select: { company: { select: { userId: true } } },
    });
    if (!offer) {
      throw new NotFoundException();
    }
    if (offer.company.userId !== userId) {
      throw new ForbiddenException();
    }
  }
}
