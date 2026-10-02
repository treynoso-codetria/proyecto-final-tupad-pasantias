import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ErrorCode } from '../../common/errors/error-code.js';
import {
  hashPassword,
  verifyPassword,
} from '../../common/security/password.js';
import { Prisma } from '../../generated/prisma/client.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { MailService } from '../../mail/mail.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { MeResponseDto } from './dto/me-response.dto.js';
import { RegisterEmployerDto } from './dto/register-employer.dto.js';
import { RegisterResponseDto } from './dto/register-response.dto.js';
import { RegisterStudentDto } from './dto/register-student.dto.js';
import { EmailLinkService } from './email-link.service.js';
import { JwtPayload } from './strategies/jwt.strategy.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailLinks: EmailLinkService,
    private readonly mail: MailService,
  ) {}

  async registerStudent(dto: RegisterStudentDto): Promise<RegisterResponseDto> {
    await this.assertEmailAvailable(dto.email);

    // Nested write: user and profile are created in a single transaction.
    const user = await this.createUser({
      email: dto.email,
      passwordHash: await hashPassword(dto.password),
      role: UserRole.STUDENT,
      studentProfile: {
        create: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          career: dto.career,
          institution: dto.institution,
        },
      },
    });

    return this.startEmailVerification(user);
  }

  async registerEmployer(
    dto: RegisterEmployerDto,
  ): Promise<RegisterResponseDto> {
    await this.assertEmailAvailable(dto.email);
    const existingCompany = await this.prisma.company.findUnique({
      where: { cuit: dto.cuit },
      select: { id: true },
    });
    if (existingCompany) {
      throw new ConflictException(ErrorCode.CUIT_TAKEN);
    }

    const user = await this.createUser({
      email: dto.email,
      passwordHash: await hashPassword(dto.password),
      role: UserRole.EMPLOYER,
      company: { create: { name: dto.companyName, cuit: dto.cuit } },
    });

    return this.startEmailVerification(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    // Same error for unknown email and wrong password, so the response does
    // not reveal which emails are registered.
    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException(ErrorCode.INVALID_CREDENTIALS);
    }
    if (!user.isActive) {
      throw new ForbiddenException(ErrorCode.ACCOUNT_DEACTIVATED);
    }
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException(ErrorCode.EMAIL_NOT_VERIFIED);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.buildAuthResponse(user);
  }

  // Completes the registration: marks the email as verified and logs the user
  // in. The link only logs in the first time; once the email is verified it
  // is rejected, so an old email cannot be used as a way into the account.
  async verifyEmail(token: string): Promise<AuthResponseDto> {
    const payload = await this.emailLinks.readToken(token, 'verify-email');
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.email !== payload.email) {
      throw new BadRequestException(ErrorCode.INVALID_OR_EXPIRED_TOKEN);
    }
    if (!user.isActive) {
      throw new ForbiddenException(ErrorCode.ACCOUNT_DEACTIVATED);
    }
    if (user.emailVerifiedAt) {
      throw new ConflictException(ErrorCode.EMAIL_ALREADY_VERIFIED);
    }

    const now = new Date();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: now, lastLoginAt: now },
    });

    return this.buildAuthResponse(user);
  }

  // Succeeds silently when there is nothing to send (unknown email, already
  // verified, deactivated), so the endpoint does not reveal which emails are
  // registered.
  async resendVerification(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerifiedAt || !user.isActive) {
      return;
    }

    const { verificationEmailSent } = await this.startEmailVerification(user);
    if (!verificationEmailSent) {
      throw new ServiceUnavailableException(ErrorCode.MAIL_DELIVERY_FAILED);
    }
  }

  async getMe(userId: string): Promise<MeResponseDto> {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        lastLoginAt: true,
        createdAt: true,
        studentProfile: {
          select: { id: true, firstName: true, lastName: true },
        },
        company: { select: { id: true, name: true } },
      },
    });
  }

  private async startEmailVerification(user: {
    id: string;
    email: string;
  }): Promise<RegisterResponseDto> {
    const link = await this.emailLinks.createVerifyEmailLink(user);
    return {
      email: user.email,
      verificationEmailSent: await this.mail.sendVerificationEmail(
        user.email,
        link,
      ),
    };
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(ErrorCode.EMAIL_TAKEN);
    }
  }

  private async createUser(data: Prisma.UserCreateInput) {
    try {
      return await this.prisma.user.create({ data });
    } catch (error) {
      // Two concurrent registrations can both pass the availability checks;
      // the unique constraints then reject the second one (P2002).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(ErrorCode.EMAIL_OR_CUIT_TAKEN);
      }
      throw error;
    }
  }

  private async buildAuthResponse(user: {
    id: string;
    email: string;
    role: UserRole;
  }): Promise<AuthResponseDto> {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
