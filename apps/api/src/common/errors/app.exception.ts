import { HttpException } from '@nestjs/common';
import { ERROR_DEFAULT_MESSAGES, ERROR_HTTP_STATUS, type ErrorCode } from '@lavio/shared';

/**
 * Erreur métier de l'API. Le filtre global la convertit au format
 * `{ error: { code, message, details? } }` (docs/02-architecture.md).
 */
export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message?: string,
    readonly details?: Record<string, unknown>,
    status?: number,
  ) {
    super(message ?? ERROR_DEFAULT_MESSAGES[code], status ?? ERROR_HTTP_STATUS[code]);
  }
}
