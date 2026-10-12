import { type ValidationError, ValidationPipe } from '@nestjs/common';
import { AppException } from '../errors/app.exception.js';

export interface FieldError {
  field: string;
  constraints: string[];
}

/** Aplati les erreurs imbriquées de class-validator : `items.0.quantity`. */
export function flattenValidationErrors(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own: FieldError[] = error.constraints
      ? [{ field, constraints: Object.keys(error.constraints) }]
      : [];
    return [...own, ...flattenValidationErrors(error.children ?? [], field)];
  });
}

/**
 * Validation globale stricte (docs/10) : propriétés inconnues refusées,
 * erreurs renvoyées au format de l'API avec le code VALIDATION_FAILED.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    stopAtFirstError: false,
    exceptionFactory: (errors) =>
      new AppException('VALIDATION_FAILED', undefined, {
        fields: flattenValidationErrors(errors),
      }),
  });
}
