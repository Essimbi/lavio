import type { PlatformRole, TenantRole } from '@lavio/shared';
import type { IconName } from '../icon/icon';

export interface NavItem {
  label: string;
  /** Chemin absolu de la route. */
  path: string;
  icon: IconName;
  /** Lien actif seulement sur la route exacte (tableau de bord). */
  exact?: boolean;
  /** Visible seulement pour ces rôles du pressing (OWNER voit tout). */
  tenantRoles?: TenantRole[];
  /** Visible seulement pour ces rôles plateforme. */
  platformRoles?: PlatformRole[];
}

export interface ShellConfig {
  /** Nom de l'espace affiché sous le logo. */
  area: string;
  /** Navigation complète (barre latérale, écran large). */
  items: NavItem[];
  /** Navigation basse sur téléphone : 5 entrées au plus. */
  mobileItems: NavItem[];
  /** Action principale permanente (ex. « Nouveau dépôt »). */
  primaryAction?: NavItem;
  /** Écran de connexion de l'espace (après déconnexion). */
  loginPath: string;
  /** Bannières de licence (application du pressing). */
  licenseBanner?: boolean;
}
