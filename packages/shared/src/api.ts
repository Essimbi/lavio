import type { ErrorCode } from './errors.js';

/** Corps de réponse d'erreur de l'API (docs/02-architecture.md). */
export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export const PAGINATION = Object.freeze({ defaultPageSize: 25, maxPageSize: 100 });

export interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  time: string;
  database: 'up' | 'down';
}

/** Configuration publique lue par la landing et l'application (GET /v1/public/config). */
export interface PublicConfig {
  whatsappNumber: string;
  whatsappDefaultMessage: string;
}
