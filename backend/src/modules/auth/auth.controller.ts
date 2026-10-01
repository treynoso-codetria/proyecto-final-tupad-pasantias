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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { AuthService } from './auth.service.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { MeResponseDto } from './dto/me-response.dto.js';
import { RegisterEmployerDto } from './dto/register-employer.dto.js';
import { RegisterStudentDto } from './dto/register-student.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register/student')
  @ApiOperation({ summary: 'Register a student account with its profile' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({
    description: 'Validation failed',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email is already registered',
    type: ErrorResponseDto,
  })
  registerStudent(@Body() dto: RegisterStudentDto): Promise<AuthResponseDto> {
    return this.authService.registerStudent(dto);
  }

  @Public()
  @Post('register/employer')
  @ApiOperation({ summary: 'Register an employer account with its company' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({
    description: 'Validation failed',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email or CUIT is already registered',
    type: ErrorResponseDto,
  })
  registerEmployer(@Body() dto: RegisterEmployerDto): Promise<AuthResponseDto> {
    return this.authService.registerEmployer(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
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
    description: 'Account is deactivated',
    type: ErrorResponseDto,
  })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
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
