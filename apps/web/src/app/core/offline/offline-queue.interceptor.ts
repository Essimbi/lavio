import { type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, mergeMap, throwError } from 'rxjs';
import { ApiError } from '../http/api';
import { OfflineQueue, REPLAY_HEADER } from './offline-queue';

/**
 * Met en file les écritures sensibles qui échouent faute de réseau (docs/09). Une clé
 * d'idempotence est ajoutée si besoin : le rejeu ne crée jamais de doublon.
 */
export const offlineQueueInterceptor: HttpInterceptorFn = (req, next) => {
  const queue = inject(OfflineQueue);
  const label = queue.label(req);
  if (!label || req.headers.has(REPLAY_HEADER)) return next(req);
  const request = req.headers.has('Idempotency-Key')
    ? req
    : req.clone({ setHeaders: { 'Idempotency-Key': crypto.randomUUID() } });
  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof ApiError && error.isNetworkError)) return throwError(() => error);
      return from(queue.enqueue(request, label)).pipe(
        mergeMap(() =>
          throwError(
            () =>
              new ApiError(
                'QUEUED',
                `Pas de réseau : ${label.toLowerCase()} en attente d’envoi. Il partira automatiquement au retour du réseau.`,
                0,
              ),
          ),
        ),
        catchError((e: unknown) => throwError(() => (e instanceof ApiError ? e : error))),
      );
    }),
  );
};
