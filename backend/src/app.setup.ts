import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// HTTP-level configuration shared by main.ts and the e2e tests, so both run
// the app with the same prefix and validation rules.
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Portal de Pasantías API')
    .setDescription(
      'REST API of the student internship and job search portal. ' +
        'Log in through POST /api/auth/login and paste the access token in "Authorize".',
    )
    .setVersion('1.0')
    .addBearerAuth()
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
