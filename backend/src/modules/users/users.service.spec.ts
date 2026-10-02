import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { ErrorCode } from '../../common/errors/error-code.js';
import { MailService } from '../../mail/mail.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EmailLinkService } from '../auth/email-link.service.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  const prisma = {
    user: {
      findUniqueOrThrow: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  const emailLinks = { createChangeEmailLink: vi.fn(), readToken: vi.fn() };
  const mail = {
    sendPasswordChangedNotice: vi.fn(),
    sendEmailChangeConfirmation: vi.fn(),
    sendEmailChangeNotice: vi.fn(),
  };
  let service: UsersService;

  const currentPassword = 'Password123!';
  const account = async () => ({
    id: 'user-1',
    email: 'ana@alumnos.dev',
    passwordHash: await bcrypt.hash(currentPassword, 4),
  });
  const changeLink = 'http://localhost:5173/confirm-email-change?token=signed';

  beforeEach(async () => {
    vi.resetAllMocks();
    prisma.user.findUniqueOrThrow.mockResolvedValue(await account());
    emailLinks.createChangeEmailLink.mockResolvedValue(changeLink);
    mail.sendEmailChangeConfirmation.mockResolvedValue(true);
    mail.sendEmailChangeNotice.mockResolvedValue(true);
    mail.sendPasswordChangedNotice.mockResolvedValue(true);
    service = new UsersService(
      prisma as unknown as PrismaService,
      emailLinks as unknown as EmailLinkService,
      mail as unknown as MailService,
    );
  });

  describe('changePassword', () => {
    it('stores the new password hashed and notifies the user', async () => {
      await service.changePassword('user-1', {
        currentPassword,
        newPassword: 'NewPassword456!',
      });

      const { data } = prisma.user.update.mock.calls[0][0];
      expect(await bcrypt.compare('NewPassword456!', data.passwordHash)).toBe(
        true,
      );
      expect(mail.sendPasswordChangedNotice).toHaveBeenCalledWith(
        'ana@alumnos.dev',
      );
    });

    it('rejects a wrong current password', async () => {
      await expect(
        service.changePassword('user-1', {
          currentPassword: 'wrong-password',
          newPassword: 'NewPassword456!',
        }),
      ).rejects.toThrow(
        new BadRequestException(ErrorCode.INVALID_CURRENT_PASSWORD),
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects a new password equal to the current one', async () => {
      await expect(
        service.changePassword('user-1', {
          currentPassword,
          newPassword: currentPassword,
        }),
      ).rejects.toThrow(
        new BadRequestException(ErrorCode.NEW_PASSWORD_SAME_AS_CURRENT),
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('requestEmailChange', () => {
    const dto = { newEmail: 'ana.nueva@alumnos.dev', currentPassword };

    it('emails a confirmation link to the new address and a notice to the current one, without changing the email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await service.requestEmailChange('user-1', dto);

      expect(mail.sendEmailChangeConfirmation).toHaveBeenCalledWith(
        'ana.nueva@alumnos.dev',
        changeLink,
      );
      expect(mail.sendEmailChangeNotice).toHaveBeenCalledWith(
        'ana@alumnos.dev',
        'ana.nueva@alumnos.dev',
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects a wrong current password', async () => {
      await expect(
        service.requestEmailChange('user-1', {
          ...dto,
          currentPassword: 'wrong-password',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mail.sendEmailChangeConfirmation).not.toHaveBeenCalled();
    });

    it('rejects the current email and an email that is already registered', async () => {
      await expect(
        service.requestEmailChange('user-1', {
          ...dto,
          newEmail: 'ana@alumnos.dev',
        }),
      ).rejects.toThrow(new BadRequestException(ErrorCode.EMAIL_UNCHANGED));

      prisma.user.findUnique.mockResolvedValue({ id: 'someone-else' });
      await expect(service.requestEmailChange('user-1', dto)).rejects.toThrow(
        new ConflictException(ErrorCode.EMAIL_TAKEN),
      );
      expect(mail.sendEmailChangeConfirmation).not.toHaveBeenCalled();
    });

    it('fails when the confirmation email cannot be sent', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      mail.sendEmailChangeConfirmation.mockResolvedValue(false);

      await expect(service.requestEmailChange('user-1', dto)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('confirmEmailChange', () => {
    const payload = {
      sub: 'user-1',
      purpose: 'change-email',
      email: 'ana@alumnos.dev',
      newEmail: 'ana.nueva@alumnos.dev',
    };

    it('applies the new email and marks it as verified', async () => {
      emailLinks.readToken.mockResolvedValue(payload);
      prisma.user.findUnique.mockResolvedValue({ email: 'ana@alumnos.dev' });

      const result = await service.confirmEmailChange('token');

      expect(emailLinks.readToken).toHaveBeenCalledWith(
        'token',
        'change-email',
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          email: 'ana.nueva@alumnos.dev',
          emailVerifiedAt: expect.any(Date),
        },
      });
      expect(result).toEqual({ email: 'ana.nueva@alumnos.dev' });
    });

    it('rejects a link that was already used', async () => {
      emailLinks.readToken.mockResolvedValue(payload);
      // The account already has the new email: the link's `email` is stale.
      prisma.user.findUnique.mockResolvedValue({
        email: 'ana.nueva@alumnos.dev',
      });

      await expect(service.confirmEmailChange('token')).rejects.toThrow(
        new BadRequestException(ErrorCode.INVALID_OR_EXPIRED_TOKEN),
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
