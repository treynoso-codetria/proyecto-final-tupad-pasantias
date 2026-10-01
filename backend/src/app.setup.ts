import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationException } from './common/errors/validation.exception.js';
import { EnvironmentVariables } from './config/env.validation.js';

// HTTP-level configuration shared by main.ts and the e2e tests, so both run
// the app with the same prefix and validation rules.
export function configureApp(app: INestApplication): void {
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config
      .get('CORS_ORIGIN', { infer: true })
      .split(',')
      .map((origin) => origin.trim()),
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // HttpExceptionFilter translates these errors to the request language.
      exceptionFactory: (errors) => new ValidationException(errors),
    }),
  );
}

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Portal de Pasantías API')
    .setDescription(
      'REST API of the student internship and job search portal. ' +
        'Log in through POST /api/auth/login and paste the access token in "Authorize". ' +
        'Error messages are returned in English, or in Spanish with "Accept-Language: es".',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addGlobalParameters({
      name: 'Accept-Language',
      in: 'header',
      required: false,
      description: 'Language of error messages',
      schema: { type: 'string', enum: ['en', 'es'], default: 'en' },
    })
    .build();

  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, config),
    {
      swaggerOptions: { persistAuthorization: true },
    },
  );
}
