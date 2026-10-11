import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../../common/errors/error-code.js';
import { Prisma } from '../../generated/prisma/client.js';
import { OfferStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CompanyResponseDto,
  PublicCompanyResponseDto,
} from './dto/company-response.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';

const withEmail = {
  user: { select: { email: true } },
} satisfies Prisma.CompanyInclude;

type CompanyWithEmail = Prisma.CompanyGetPayload<{ include: typeof withEmail }>;

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async getOwnCompany(userId: string): Promise<CompanyResponseDto> {
    const company = await this.prisma.company.findUnique({
      where: { userId },
      include: withEmail,
    });
    if (!company) {
      throw new NotFoundException();
    }
    return toResponse(company);
  }

  async updateOwnCompany(
    userId: string,
    dto: UpdateCompanyDto,
  ): Promise<CompanyResponseDto> {
    if (dto.cuit !== undefined) {
      const cuitOwner = await this.prisma.company.findUnique({
        where: { cuit: dto.cuit },
        select: { userId: true },
      });
      if (cuitOwner && cuitOwner.userId !== userId) {
        throw new ConflictException(ErrorCode.CUIT_TAKEN);
      }
    }

    try {
      // Fields absent from the DTO are undefined, which Prisma leaves
      // untouched.
      const company = await this.prisma.company.update({
        where: { userId },
        data: dto,
        include: withEmail,
      });
      return toResponse(company);
    } catch (error) {
      // Another company took the CUIT between the check and the update.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(ErrorCode.CUIT_TAKEN);
      }
      throw error;
    }
  }

  // Public page. A company whose account was deactivated by an administrator
  // is not shown. Only offers that can still be applied to are listed: open,
  // and with no deadline or one that has not passed.
  async getPublicCompany(id: string): Promise<PublicCompanyResponseDto> {
    const today = new Date(new Date().toISOString().slice(0, 10));
    const company = await this.prisma.company.findFirst({
      where: { id, user: { isActive: true } },
      include: {
        offers: {
          where: {
            status: OfferStatus.OPEN,
            OR: [{ deadline: null }, { deadline: { gte: today } }],
          },
          orderBy: { publishedAt: 'desc' },
          select: {
            id: true,
            title: true,
            type: true,
            modality: true,
            workload: true,
            province: true,
            city: true,
            publishedAt: true,
            deadline: true,
          },
        },
      },
    });
    if (!company) {
      throw new NotFoundException();
    }

    return {
      id: company.id,
      name: company.name,
      industry: company.industry,
      description: company.description,
      website: company.website,
      logoUrl: company.logoUrl,
      province: company.province,
      city: company.city,
      openOffers: company.offers.map((offer) => ({
        ...offer,
        deadline: offer.deadline?.toISOString().slice(0, 10) ?? null,
      })),
    };
  }
}

function toResponse(company: CompanyWithEmail): CompanyResponseDto {
  return {
    id: company.id,
    email: company.user.email,
    name: company.name,
    cuit: company.cuit,
    industry: company.industry,
    description: company.description,
    website: company.website,
    logoUrl: company.logoUrl,
    phone: company.phone,
    province: company.province,
    city: company.city,
    updatedAt: company.updatedAt,
  };
}
