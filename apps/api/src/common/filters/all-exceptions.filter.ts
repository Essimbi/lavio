import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ERROR_DEFAULT_MESSAGES,
  ERROR_HTTP_STATUS,
  type ApiErrorBody,
  type ErrorCode,
} from '@lavio/shared';
import type { Response } from 'express';
import { AppException } from '../errors/app.exception.js';

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'RATE_LIMITED',
};

interface PrismaLikeError {
  name: string;
  code: string;
  meta?: Record<string, unknown>;
}

const isPrismaKnownError = (e: unknown): e is PrismaLikeError =>
  typeof e === 'object' &&
  e !== null &&
  (e as { name?: unknown }).name === 'PrismaClientKnownRequestError' &&
  typeof (e as { code?: unknown }).code === 'string';

/** Erreurs émises par body-parser (corps trop gros, JSON invalide). */
const isBodyParserError = (e: unknown): e is { status: number; type: string } =>
  typeof e === 'object' &&
  e !== null &&
  typeof (e as { status?: unknown }).status === 'number' &&
  typeof (e as { type?: unknown }).type === 'string';

export interface MappedError {
  status: number;
  body: ApiErrorBody;
}

/** Convertit n'importe quelle erreur en réponse au format de l'API. */
export function mapException(exception: unknown): MappedError {
  const build = (
    code: ErrorCode,
    status = ERROR_HTTP_STATUS[code],
    message = ERROR_DEFAULT_MESSAGES[code],
    details?: Record<string, unknown>,
  ): MappedError => ({
    status,
    body: { error: details ? { code, message, details } : { code, message } },
  });

  if (exception instanceof AppException) {
    return build(exception.code, exception.getStatus(), exception.message, exception.details);
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const code = STATUS_TO_CODE[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_FAILED');
    // Les messages des exceptions Nest sont en anglais : on garde le message français par défaut.
    return build(code, status);
  }

  if (isPrismaKnownError(exception)) {
    if (exception.code === 'P2002') return build('CONFLICT');
    if (exception.code === 'P2025') return build('NOT_FOUND');
  }

  if (isBodyParserError(exception)) {
    if (exception.type === 'entity.too.large') return build('PAYLOAD_TOO_LARGE');
    if (exception.status === 400) return build('VALIDATION_FAILED');
  }

  return build('INTERNAL_ERROR', HttpStatus.INTERNAL_SERVER_ERROR);
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = mapException(exception);
    if (status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }
    response.status(status).json(body);
  }
}
