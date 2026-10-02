import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { AuthService } from './auth.service.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { EmailTokenDto } from './dto/email-token.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { MeResponseDto } from './dto/me-response.dto.js';
import { RegisterEmployerDto } from './dto/register-employer.dto.js';
import { RegisterResponseDto } from './dto/register-response.dto.js';
import { RegisterStudentDto } from './dto/register-student.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register/student')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Register a student account with its profile',
    description:
      'Sends a verification link to the email. The account cannot log in ' +
      'until that link is opened (POST /auth/verify-email).',
  })
  @ApiCreatedResponse({ type: RegisterResponseDto })
  @ApiBadRequestResponse({
    description: 'Validation failed',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email is already registered',
    type: ErrorResponseDto,
  })
  registerStudent(
    @Body() dto: RegisterStudentDto,
  ): Promise<RegisterResponseDto> {
    return this.authService.registerStudent(dto);
  }

  @Public()
  @Post('register/employer')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Register an employer account with its company',
    description:
      'Sends a verification link to the email. The account cannot log in ' +
      'until that link is opened (POST /auth/verify-email).',
  })
  @ApiCreatedResponse({ type: RegisterResponseDto })
  @ApiBadRequestResponse({
    description: 'Validation failed',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email or CUIT is already registered',
    type: ErrorResponseDto,
  })
  registerEmployer(
    @Body() dto: RegisterEmployerDto,
  ): Promise<RegisterResponseDto> {
    return this.authService.registerEmployer(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({
    description: 'Validation failed',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Account is deactivated, or its email is not verified yet',
    type: ErrorResponseDto,
  })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Verify the email with the emailed token and log in',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid or expired link',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Account is deactivated',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'The email was already verified',
    type: ErrorResponseDto,
  })
  verifyEmail(@Body() dto: EmailTokenDto): Promise<AuthResponseDto> {
    return this.authService.verifyEmail(dto.token);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Send the verification email again',
    description:
      'Always answers 204 for a well-formed email, whether or not an ' +
      'unverified account exists for it.',
  })
  @ApiNoContentResponse({ description: 'Request accepted' })
  @ApiBadRequestResponse({
    description: 'Validation failed',
    type: ErrorResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'The email could not be sent',
    type: ErrorResponseDto,
  })
  resendVerification(@Body() dto: ResendVerificationDto): Promise<void> {
    return this.authService.resendVerification(dto.email);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid or expired token, or deactivated account',
    type: ErrorResponseDto,
  })
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<MeResponseDto> {
    return this.authService.getMe(user.id);
  }
}
