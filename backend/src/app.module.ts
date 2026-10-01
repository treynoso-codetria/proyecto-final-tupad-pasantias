import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';
import { fileURLToPath } from 'node:url';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { validateEnv } from './config/env.validation.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // API messages are in English unless the request asks for another
    // supported language through the Accept-Language header ("es", "es-AR").
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: fileURLToPath(new URL('./i18n/', import.meta.url)),
        watch: process.env.NODE_ENV !== 'production',
      },
      resolvers: [new AcceptLanguageResolver({ matchType: 'strict-loose' })],
    }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // Order matters: authentication runs first, then the role check.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
