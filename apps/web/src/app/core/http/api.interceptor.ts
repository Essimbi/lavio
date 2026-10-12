import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import {
  API_BASE,
  ApiError,
  isApiErrorBody,
  NETWORK_ERROR_MESSAGE,
  UNKNOWN_ERROR_MESSAGE,
} from './api';

/**
 * Intercepteur des appels à l'API :
 * - ajoute `X-Requested-With` (exigé par l'API sur refresh et logout, docs/10) ;
 * - convertit toute erreur en `ApiError` avec un message en français.
 * Le jeton d'accès sera ajouté en phase 1 (authentification).
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE)) return next(req);

  const request = req.clone({ setHeaders: { 'X-Requested-With': 'XMLHttpRequest' } });

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);
      if (error.status === 0) {
        return throwError(() => new ApiError('NETWORK_ERROR', NETWORK_ERROR_MESSAGE, 0));
      }
      if (isApiErrorBody(error.error)) {
        const { code, message, details } = error.error.error;
        return throwError(() => new ApiError(code, message, error.status, details));
      }
      return throwError(() => new ApiError('INTERNAL_ERROR', UNKNOWN_ERROR_MESSAGE, error.status));
    }),
  );
};
