import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Accès à l'application du pressing : session valide d'un utilisateur de pressing,
 * mot de passe définitif. Les droits réels sont toujours vérifiés par l'API.
 */
export const tenantGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!(await auth.restore()))
    return router.createUrlTree(['/login'], { queryParams: { retour: state.url } });
  if (auth.isPlatform()) return router.createUrlTree(['/admin']);
  if (auth.user()?.mustChangePassword) return router.createUrlTree(['/app/password']);
  return true;
};

/** Accès au superadmin : utilisateur plateforme. */
export const platformGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!(await auth.restore()))
    return router.createUrlTree(['/admin/login'], { queryParams: { retour: state.url } });
  if (!auth.isPlatform()) return router.createUrlTree(['/app']);
  if (auth.user()?.mustChangePassword) return router.createUrlTree(['/admin/password']);
  return true;
};

/** Écran de changement de mot de passe : session requise, quel que soit l'espace. */
export const sessionGuard =
  (loginPath: string): CanActivateFn =>
  async () => {
    const auth = inject(AuthService);
    return (await auth.restore()) || inject(Router).createUrlTree([loginPath]);
  };

/** Rôles du pressing (masque l'écran ; l'API applique la même règle). */
export const tenantRoleGuard =
  (...roles: Parameters<AuthService['hasTenantRole']>): CanActivateFn =>
  () =>
    inject(AuthService).hasTenantRole(...roles) || inject(Router).createUrlTree(['/app']);

/** Rôles plateforme (PARTNER_VIEWER en lecture seule). */
export const platformRoleGuard =
  (...roles: Parameters<AuthService['hasPlatformRole']>): CanActivateFn =>
  () =>
    inject(AuthService).hasPlatformRole(...roles) || inject(Router).createUrlTree(['/admin']);

/** Après connexion : destination selon le type d'utilisateur. */
export function homeFor(auth: AuthService): string {
  if (auth.user()?.mustChangePassword)
    return auth.isPlatform() ? '/admin/password' : '/app/password';
  return auth.isPlatform() ? '/admin' : '/app';
}
