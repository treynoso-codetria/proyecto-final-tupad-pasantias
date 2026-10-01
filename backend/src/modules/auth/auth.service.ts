import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { Prisma } from '../../generated/prisma/client.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { MeResponseDto } from './dto/me-response.dto.js';
import { RegisterEmployerDto } from './dto/register-employer.dto.js';
import { RegisterStudentDto } from './dto/register-student.dto.js';
import { JwtPayload } from './strategies/jwt.strategy.js';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async registerStudent(dto: RegisterStudentDto): Promise<AuthResponseDto> {
    await this.assertEmailAvailable(dto.email);

    // Nested write: user and profile are created in a single transaction.
    const user = await this.createUser({
      email: dto.email,
      passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
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

    return this.buildAuthResponse(user);
  }

  async registerEmployer(dto: RegisterEmployerDto): Promise<AuthResponseDto> {
    await this.assertEmailAvailable(dto.email);
    const existingCompany = await this.prisma.company.findUnique({
      where: { cuit: dto.cuit },
      select: { id: true },
    });
    if (existingCompany) {
      throw new ConflictException('CUIT is already registered');
    }

    const user = await this.createUser({
      email: dto.email,
      passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      role: UserRole.EMPLOYER,
      company: { create: { name: dto.companyName, cuit: dto.cuit } },
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    // Same error for unknown email and wrong password, so the response does
    // not reveal which emails are registered.
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.buildAuthResponse(user);
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

  private async assertEmailAvailable(email: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
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
        throw new ConflictException('Email or CUIT is already registered');
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
