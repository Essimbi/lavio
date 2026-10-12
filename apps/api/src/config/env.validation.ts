import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

const toBool = ({ value }: { value: unknown }): unknown =>
  value === undefined || value === '' ? undefined : value === true || value === 'true';

/** Variables d'environnement de l'API, validées au démarrage (docs/11-deploiement-vercel.md). */
export class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: 'development' | 'test' | 'production' = 'development';

  @Transform(({ value }: { value: unknown }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @IsIn(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
  LOG_LEVEL = 'info';

  @Transform(toBool)
  @IsOptional()
  @IsBoolean()
  SWAGGER_ENABLED?: boolean;

  @IsString()
  @MinLength(1, { message: 'DATABASE_URL est obligatoire' })
  DATABASE_URL!: string;

  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true })
  APP_URL?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, { exposeDefaultValues: true });
  const errors = validateSync(env, { skipMissingProperties: false, whitelist: false });
  if (errors.length > 0) {
    const details = errors
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('; ');
    throw new Error(`Configuration invalide : ${details}`);
  }
  return env;
}
