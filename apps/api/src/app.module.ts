import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { type EnvironmentVariables, validateEnv } from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      envFilePath: process.env['NODE_ENV'] === 'test' ? '.env.test' : '.env',
      // Sur Vercel, les variables viennent uniquement de l'environnement du projet.
      ignoreEnvFile: process.env['VERCEL'] === '1',
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          genReqId: (req) => (req.headers['x-vercel-id'] as string | undefined) ?? randomUUID(),
          // Jamais de jeton, cookie ni mot de passe dans les journaux (docs/10).
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
              '*.password',
              '*.token',
            ],
            censor: '[masqué]',
          },
          autoLogging: { ignore: (req) => req.url === '/v1/health' },
        },
      }),
    }),
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}
