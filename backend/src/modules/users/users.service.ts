import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ErrorCode } from '../../common/errors/error-code.js';
import {
  hashPassword,
  verifyPassword,
} from '../../common/security/password.js';
import { Prisma } from '../../generated/prisma/client.js';
import { MailService } from '../../mail/mail.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EmailLinkService } from '../auth/email-link.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { EmailChangedResponseDto } from './dto/email-changed-response.dto.js';
import { RequestEmailChangeDto } from './dto/request-email-change.dto.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailLinks: EmailLinkService,
    private readonly mail: MailService,
  ) {}

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.getUserCheckingPassword(
      userId,
      dto.currentPassword,
    );
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException(ErrorCode.NEW_PASSWORD_SAME_AS_CURRENT);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(dto.newPassword) },
    });

    // Best effort: the password is already changed if this email fails.
    await this.mail.sendPasswordChangedNotice(user.email);
  }

  // The email is not changed here: a confirmation link is sent to the new
  // address, and the change is applied by confirmEmailChange() once its owner
  // opens it. The current address is told about the request.
  async requestEmailChange(
    userId: string,
    dto: RequestEmailChangeDto,
  ): Promise<void> {
    const user = await this.getUserCheckingPassword(
      userId,
      dto.currentPassword,
    );
    if (dto.newEmail === user.email) {
      throw new BadRequestException(ErrorCode.EMAIL_UNCHANGED);
    }
    const emailOwner = await this.prisma.user.findUnique({
      where: { email: dto.newEmail },
      select: { id: true },
    });
    if (emailOwner) {
      throw new ConflictException(ErrorCode.EMAIL_TAKEN);
    }

    const link = await this.emailLinks.createChangeEmailLink(
      user,
      dto.newEmail,
    );
    const sent = await this.mail.sendEmailChangeConfirmation(
      dto.newEmail,
      link,
    );
    if (!sent) {
      throw new ServiceUnavailableException(ErrorCode.MAIL_DELIVERY_FAILED);
    }

    // Best effort: the request stands even if this notice cannot be sent.
    await this.mail.sendEmailChangeNotice(user.email, dto.newEmail);
  }

  async confirmEmailChange(token: string): Promise<EmailChangedResponseDto> {
    const payload = await this.emailLinks.readToken(token, 'change-email');
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { email: true },
    });
    // `user.email !== payload.email` means the account's email changed after
    // the link was created: the link was already used, or is superseded.
    if (!user || !payload.newEmail || user.email !== payload.email) {
      throw new BadRequestException(ErrorCode.INVALID_OR_EXPIRED_TOKEN);
    }

    try {
      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { email: payload.newEmail, emailVerifiedAt: new Date() },
      });
    } catch (error) {
      // Someone else registered the address after the link was sent.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(ErrorCode.EMAIL_TAKEN);
      }
      throw error;
    }

    return { email: payload.newEmail };
  }

  // Sensitive account changes require the current password again, so that a
  // session left open (or a stolen token) is not enough to take the account.
  private async getUserCheckingPassword(userId: string, password: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, passwordHash: true },
    });
    if (!(await verifyPassword(password, user.passwordHash))) {
      throw new BadRequestException(ErrorCode.INVALID_CURRENT_PASSWORD);
    }
    return user;
  }
}
