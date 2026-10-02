import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { ErrorCode } from '../../common/errors/error-code.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { MailService } from '../../mail/mail.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import { EmailLinkService } from './email-link.service.js';

describe('AuthService', () => {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    company: { findUnique: vi.fn() },
  };
  const jwtService = { signAsync: vi.fn() };
  const emailLinks = { createVerifyEmailLink: vi.fn(), readToken: vi.fn() };
  const mail = { sendVerificationEmail: vi.fn() };
  let service: AuthService;

  const studentDto = {
    email: 'ana@alumnos.dev',
    password: 'Password123!',
    firstName: 'Ana',
    lastName: 'Gómez',
    career: 'TUP',
    institution: 'UTN',
  };
  const employerDto = {
    email: 'rrhh@techsur.dev',
    password: 'Password123!',
    companyName: 'TechSur S.A.',
    cuit: '30-71234567-8',
  };
  const verifyLink = 'http://localhost:5173/verify-email?token=signed';

  const storedUser = async (overrides = {}) => ({
    id: 'user-1',
    email: studentDto.email,
    passwordHash: await bcrypt.hash(studentDto.password, 4),
    role: UserRole.STUDENT,
    isActive: true,
    emailVerifiedAt: new Date('2026-10-01T00:00:00Z'),
    ...overrides,
  });

  beforeEach(() => {
    vi.resetAllMocks();
    jwtService.signAsync.mockResolvedValue('signed.jwt.token');
    emailLinks.createVerifyEmailLink.mockResolvedValue(verifyLink);
    mail.sendVerificationEmail.mockResolvedValue(true);
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      emailLinks as unknown as EmailLinkService,
      mail as unknown as MailService,
    );
  });

  describe('registerStudent', () => {
    it('creates the user with a hashed password and its profile, and emails a verification link', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'user-1', email: data.email, role: data.role }),
      );

      const result = await service.registerStudent(studentDto);

      const { data } = prisma.user.create.mock.calls[0][0];
      expect(data.role).toBe(UserRole.STUDENT);
      expect(data.passwordHash).not.toBe(studentDto.password);
      expect(await bcrypt.compare(studentDto.password, data.passwordHash)).toBe(
        true,
      );
      expect(data.studentProfile.create).toEqual({
        firstName: 'Ana',
        lastName: 'Gómez',
        career: 'TUP',
        institution: 'UTN',
      });
      expect(mail.sendVerificationEmail).toHaveBeenCalledWith(
        studentDto.email,
        verifyLink,
      );
      // Registering does not log the user in.
      expect(jwtService.signAsync).not.toHaveBeenCalled();
      expect(result).toEqual({
        email: studentDto.email,
        verificationEmailSent: true,
      });
    });

    it('still creates the account when the email cannot be sent, and reports it', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'user-1', email: data.email, role: data.role }),
      );
      mail.sendVerificationEmail.mockResolvedValue(false);

      const result = await service.registerStudent(studentDto);

      expect(result.verificationEmailSent).toBe(false);
    });

    it('rejects an email that is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.registerStudent(studentDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(mail.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('registerEmployer', () => {
    it('creates the user with its company', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.company.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'user-2', email: data.email, role: data.role }),
      );

      const result = await service.registerEmployer(employerDto);

      const { data } = prisma.user.create.mock.calls[0][0];
      expect(data.role).toBe(UserRole.EMPLOYER);
      expect(data.company.create).toEqual({
        name: 'TechSur S.A.',
        cuit: '30-71234567-8',
      });
      expect(result.email).toBe(employerDto.email);
    });

    it('rejects a CUIT that is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.company.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.registerEmployer(employerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const credentials = {
      email: studentDto.email,
      password: studentDto.password,
    };

    it('returns a token and records the login time', async () => {
      prisma.user.findUnique.mockResolvedValue(await storedUser());

      const result = await service.login(credentials);

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('rejects an unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(credentials)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(await storedUser());

      await expect(
        service.login({ ...credentials, password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('rejects a deactivated account', async () => {
      prisma.user.findUnique.mockResolvedValue(
        await storedUser({ isActive: false }),
      );

      await expect(service.login(credentials)).rejects.toThrow(
        ForbiddenException,
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('rejects an account whose email is not verified', async () => {
      prisma.user.findUnique.mockResolvedValue(
        await storedUser({ emailVerifiedAt: null }),
      );

      await expect(service.login(credentials)).rejects.toThrow(
        new ForbiddenException(ErrorCode.EMAIL_NOT_VERIFIED),
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    beforeEach(() => {
      emailLinks.readToken.mockResolvedValue({
        sub: 'user-1',
        purpose: 'verify-email',
        email: studentDto.email,
      });
    });

    it('marks the email as verified and logs the user in', async () => {
      prisma.user.findUnique.mockResolvedValue(
        await storedUser({ emailVerifiedAt: null }),
      );

      const result = await service.verifyEmail('token');

      expect(emailLinks.readToken).toHaveBeenCalledWith(
        'token',
        'verify-email',
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          emailVerifiedAt: expect.any(Date),
          lastLoginAt: expect.any(Date),
        },
      });
      expect(result.accessToken).toBe('signed.jwt.token');
    });

    it('does not log in again with a link that was already used', async () => {
      prisma.user.findUnique.mockResolvedValue(await storedUser());

      await expect(service.verifyEmail('token')).rejects.toThrow(
        new ConflictException(ErrorCode.EMAIL_ALREADY_VERIFIED),
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('rejects a link created for an email the account no longer has', async () => {
      prisma.user.findUnique.mockResolvedValue(
        await storedUser({ email: 'other@alumnos.dev', emailVerifiedAt: null }),
      );

      await expect(service.verifyEmail('token')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('resendVerification', () => {
    it('sends a new link to an unverified account', async () => {
      prisma.user.findUnique.mockResolvedValue(
        await storedUser({ emailVerifiedAt: null }),
      );

      await service.resendVerification(studentDto.email);

      expect(mail.sendVerificationEmail).toHaveBeenCalledWith(
        studentDto.email,
        verifyLink,
      );
    });

    it('does nothing, without failing, for an unknown or already verified email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await service.resendVerification('nobody@alumnos.dev');

      prisma.user.findUnique.mockResolvedValue(await storedUser());
      await service.resendVerification(studentDto.email);

      expect(mail.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('fails when the email cannot be sent', async () => {
      prisma.user.findUnique.mockResolvedValue(
        await storedUser({ emailVerifiedAt: null }),
      );
      mail.sendVerificationEmail.mockResolvedValue(false);

      await expect(
        service.resendVerification(studentDto.email),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
