import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { jsonReplacer } from './common/http/json.js';
import { createValidationPipe } from './common/pipes/validation.js';
import type { EnvironmentVariables } from './config/env.validation.js';

export const API_PREFIX = 'v1';

/** Applique la configuration commune (production, développement et tests end-to-end). */
export function configureApp(app: NestExpressApplication): NestExpressApplication {
  const config = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  app.useLogger(app.get(Logger));
  app.set('json replacer', jsonReplacer);
  app.set('trust proxy', true);
  app.disable('x-powered-by');

  // Corps limités (docs/10) ; les photos passent par Vercel Blob en direct.
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { extended: false, limit: '100kb' });

  app.use(helmet());
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerEnabled =
    config.get('SWAGGER_ENABLED', { infer: true }) ??
    config.get('NODE_ENV', { infer: true }) !== 'production';
  if (swaggerEnabled) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('API Lavio')
        .setDescription('API REST de Lavio, le pressing sous contrôle.')
        .setVersion('1')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup(`${API_PREFIX}/docs`, app, document);
  }

  return app;
}

/** Crée l'application Nest (une seule fois par instance, y compris en serverless). */
export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  return configureApp(app);
}
