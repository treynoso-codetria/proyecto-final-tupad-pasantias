import { plainToInstance } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';

// Sending email is mandatory in production. Elsewhere it is optional: without
// an API key, emails are written to the log instead of being sent.
const mailIsRequired = (env: EnvironmentVariables) =>
  env.NODE_ENV === 'production' || env.BREVO_API_KEY !== undefined;

export class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '1d';

  // Frontend origin(s) allowed by CORS; comma-separated for more than one.
  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = 'http://localhost:5173';

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  NODE_ENV: string = 'development';

  // Base URL of the frontend, used to build the links sent by email.
  @IsUrl({ require_tld: false })
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:5173';

  // Brevo (https://www.brevo.com) transactional email API key.
  @ValidateIf(mailIsRequired)
  @IsString()
  @IsNotEmpty()
  BREVO_API_KEY?: string;

  // Sender address; it must be a verified sender in the Brevo account.
  @ValidateIf(mailIsRequired)
  @IsEmail()
  MAIL_FROM_EMAIL?: string;

  @IsString()
  @IsOptional()
  MAIL_FROM_NAME: string = 'Internship Portal';
}

// Fails fast at startup when a required variable is missing or malformed.
export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated);

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment variables: ${details}`);
  }

  return validated;
}
