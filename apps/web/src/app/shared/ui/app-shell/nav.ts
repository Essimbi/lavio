import type { IconName } from '../icon/icon';

export interface NavItem {
  label: string;
  /** Chemin absolu de la route. */
  path: string;
  icon: IconName;
  /** Lien actif seulement sur la route exacte (tableau de bord). */
  exact?: boolean;
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
}
