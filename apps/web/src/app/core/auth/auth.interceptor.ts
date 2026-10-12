import { HttpErrorResponse, type HttpInterceptorFn, type HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { API_BASE } from '../http/api';
import { AuthService } from './auth.service';

/** Routes qui n'utilisent pas le jeton d'accès. */
const NO_TOKEN = [
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/accept-invitation',
  '/public/',
];

const withToken = (req: HttpRequest<unknown>, token: string | null) =>
  token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

/**
 * Ajoute le jeton d'accès ; sur 401, rafraîchit la session une fois et rejoue la requête.
 * Si le rafraîchissement échoue, renvoie vers l'écran de connexion de l'espace courant.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE) || NO_TOKEN.some((p) => req.url.startsWith(API_BASE + p))) {
    return next(req);
  }
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(withToken(req, auth.accessToken)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401)
        return throwError(() => error);
      return from(auth.refresh()).pipe(
        switchMap((ok) => {
          if (ok) return next(withToken(req, auth.accessToken));
          const area = router.url.startsWith('/admin') ? '/admin/login' : '/login';
          void router.navigate([area], { queryParams: { retour: router.url } });
          return throwError(() => error);
        }),
      );
    }),
  );
};
