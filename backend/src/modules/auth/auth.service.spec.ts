import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { UserRole } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

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

  beforeEach(() => {
    vi.resetAllMocks();
    jwtService.signAsync.mockResolvedValue('signed.jwt.token');
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
    );
  });

  describe('registerStudent', () => {
    it('creates the user with a hashed password and its profile, and returns a token', async () => {
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
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        role: UserRole.STUDENT,
      });
      expect(result).toEqual({
        accessToken: 'signed.jwt.token',
        user: { id: 'user-1', email: studentDto.email, role: UserRole.STUDENT },
      });
    });

    it('rejects an email that is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.registerStudent(studentDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
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
      expect(result.user.role).toBe(UserRole.EMPLOYER);
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
    const storedUser = async (overrides = {}) => ({
      id: 'user-1',
      email: studentDto.email,
      passwordHash: await bcrypt.hash(studentDto.password, 4),
      role: UserRole.STUDENT,
      isActive: true,
      ...overrides,
    });
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
  });
});
