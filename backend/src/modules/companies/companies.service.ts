import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { today, toIsoDate } from '../../common/dates.js';
import { ErrorCode } from '../../common/errors/error-code.js';
import { Prisma } from '../../generated/prisma/client.js';
import { OfferStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { UploadedFile } from '../../storage/file-types.js';
import { StorageService } from '../../storage/storage.service.js';
import { checkUpload, UPLOAD_RULES } from '../../storage/uploads.js';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getOwnCompany(userId: string): Promise<CompanyResponseDto> {
    const company = await this.prisma.company.findUnique({
      where: { userId },
      include: withEmail,
    });
    if (!company) {
      throw new NotFoundException();
    }
    return this.toResponse(company);
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
      return this.toResponse(company);
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

  // Uploads a new logo (PNG, JPG or WebP) or replaces the current one.
  async uploadLogo(
    userId: string,
    file: UploadedFile | undefined,
  ): Promise<CompanyResponseDto> {
    const kind = checkUpload(file, UPLOAD_RULES.logo);
    const current = await this.prisma.company.findUniqueOrThrow({
      where: { userId },
      select: { id: true, logoUrl: true },
    });

    const key = await this.storage.store(
      'logos',
      current.id,
      file!.buffer,
      kind,
    );
    let company: CompanyWithEmail;
    try {
      company = await this.prisma.company.update({
        where: { userId },
        data: { logoUrl: key },
        include: withEmail,
      });
    } catch (error) {
      await this.storage.deleteQuietly(key);
      throw error;
    }

    if (current.logoUrl) {
      await this.storage.deleteQuietly(current.logoUrl);
    }
    return this.toResponse(company);
  }

  async deleteLogo(userId: string): Promise<CompanyResponseDto> {
    const current = await this.prisma.company.findUniqueOrThrow({
      where: { userId },
      select: { logoUrl: true },
    });
    const company = await this.prisma.company.update({
      where: { userId },
      data: { logoUrl: null },
      include: withEmail,
    });
    if (current.logoUrl) {
      await this.storage.deleteQuietly(current.logoUrl);
    }
    return this.toResponse(company);
  }

  // A signed link to the logo of a company shown publicly (same rule as the
  // public page).
  async getLogoUrl(id: string): Promise<string> {
    const company = await this.prisma.company.findFirst({
      where: { id, user: { isActive: true } },
      select: { logoUrl: true },
    });
    const url = await this.storage.signedUrl(company?.logoUrl ?? null);
    if (!url) {
      throw new NotFoundException();
    }
    return url;
  }

  // Public page. A company whose account was deactivated by an administrator
  // is not shown. Only offers that can still be applied to are listed: open,
  // and with no deadline or one that has not passed.
  async getPublicCompany(id: string): Promise<PublicCompanyResponseDto> {
    const company = await this.prisma.company.findFirst({
      where: { id, user: { isActive: true } },
      include: {
        offers: {
          where: {
            status: OfferStatus.OPEN,
            OR: [{ deadline: null }, { deadline: { gte: today() } }],
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
      logoUrl: this.storage.logoUrl(company.id, company.logoUrl),
      province: company.province,
      city: company.city,
      openOffers: company.offers.map((offer) => ({
        ...offer,
        deadline: toIsoDate(offer.deadline),
      })),
    };
  }

  private toResponse(company: CompanyWithEmail): CompanyResponseDto {
    return {
      id: company.id,
      email: company.user.email,
      name: company.name,
      cuit: company.cuit,
      industry: company.industry,
      description: company.description,
      website: company.website,
      logoUrl: this.storage.logoUrl(company.id, company.logoUrl),
      phone: company.phone,
      province: company.province,
      city: company.city,
      updatedAt: company.updatedAt,
    };
  }
}
