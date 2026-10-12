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

// Same for file storage: production needs object storage (Render's disk is
// wiped on every deploy); elsewhere files go to the local disk unless a
// bucket is configured.
const objectStorageIsRequired = (env: EnvironmentVariables) =>
  env.NODE_ENV === 'production' || env.S3_BUCKET !== undefined;

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

  // S3-compatible object storage (Backblaze B2 in production), e.g.
  // endpoint https://s3.us-east-005.backblazeb2.com and region us-east-005.
  @ValidateIf(objectStorageIsRequired)
  @IsString()
  @IsNotEmpty()
  S3_BUCKET?: string;

  @ValidateIf(objectStorageIsRequired)
  @IsUrl({ require_tld: false })
  S3_ENDPOINT?: string;

  @ValidateIf(objectStorageIsRequired)
  @IsString()
  @IsNotEmpty()
  S3_REGION?: string;

  @ValidateIf(objectStorageIsRequired)
  @IsString()
  @IsNotEmpty()
  S3_ACCESS_KEY_ID?: string;

  @ValidateIf(objectStorageIsRequired)
  @IsString()
  @IsNotEmpty()
  S3_SECRET_ACCESS_KEY?: string;

  // Without object storage: where files are kept.
  @IsString()
  @IsOptional()
  LOCAL_STORAGE_DIR: string = 'uploads';

  // Public URL of this API, used in the links to files (company logos). In
  // development it defaults to http://localhost:<PORT>.
  @ValidateIf((env: EnvironmentVariables) => env.NODE_ENV === 'production')
  @IsUrl({ require_tld: false })
  PUBLIC_API_URL?: string;
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
