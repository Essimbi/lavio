import { ConfigService } from '@nestjs/config';
import { createApp } from './app.factory.js';
import type { EnvironmentVariables } from './config/env.validation.js';

// Point d'entrée reconnu par Vercel (NestJS sans configuration) et utilisé en local.
const app = await createApp();
const config = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
await app.listen(config.get('PORT', { infer: true }));
