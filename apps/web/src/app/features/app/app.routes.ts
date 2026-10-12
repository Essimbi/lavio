import type { Routes } from '@angular/router';
import { sessionGuard, tenantGuard, tenantRoleGuard } from '../../core/auth/guards';
import { AppShell } from '../../shared/ui/app-shell/app-shell';
import type { NavItem, ShellConfig } from '../../shared/ui/app-shell/nav';
import type { MenuEntry } from './menu-page';
import { ModulePlaceholder } from './module-placeholder';

/** Navigation de l'application du pressing (docs/08, « Navigation »). */
const items: NavItem[] = [
  { label: 'Tableau de bord', path: '/app', icon: 'home', exact: true },
  { label: 'Dépôts', path: '/app/deposits', icon: 'ticket' },
  { label: 'Clients', path: '/app/customers', icon: 'users' },
  { label: 'Suivi', path: '/app/tracking', icon: 'track' },
  { label: 'Caisse', path: '/app/cash', icon: 'cash' },
  { label: 'Paiements', path: '/app/payments', icon: 'card' },
  { label: 'Stock', path: '/app/stock', icon: 'box' },
  { label: 'Achats', path: '/app/purchasing', icon: 'cart' },
  { label: 'Dépenses', path: '/app/expenses', icon: 'receipt' },
  { label: 'Comptabilité', path: '/app/accounting', icon: 'chart' },
  { label: 'Tournées', path: '/app/tours', icon: 'truck' },
  { label: 'Paramètres', path: '/app/settings', icon: 'settings' },
];

const byPath = (path: string): NavItem => {
  const item = items.find((i) => i.path === path);
  if (!item) throw new Error(`Entrée de navigation inconnue : ${path}`);
  return item;
};

export const appShellConfig: ShellConfig = {
  area: 'Espace pressing',
  loginPath: '/login',
  licenseBanner: true,
  items,
  mobileItems: [
    { ...byPath('/app'), label: 'Accueil' },
    { ...byPath('/app/deposits'), label: 'Activité' },
    byPath('/app/cash'),
    byPath('/app/stock'),
    { label: 'Plus', path: '/app/more', icon: 'more' },
  ],
  primaryAction: { label: 'Nouveau dépôt', path: '/app/deposits/new', icon: 'plus' },
};

const settingsEntries: MenuEntry[] = [
  {
    label: 'Ma licence',
    description: 'Plan, dates, renouvellement.',
    path: '/app/license',
    icon: 'key',
  },
  {
    label: 'Utilisateurs',
    description: 'Inviter, rôles, désactivation.',
    path: '/app/settings/users',
    icon: 'users',
    ownerOnly: true,
  },
  {
    label: "Journal d'audit",
    description: 'Actions sensibles du pressing.',
    path: '/app/settings/audit',
    icon: 'shield',
    ownerOnly: true,
  },
  {
    label: 'Mot de passe',
    description: 'Changer votre mot de passe.',
    path: '/app/password',
    icon: 'key',
  },
];

const moreEntries: MenuEntry[] = [...settingsEntries];

const placeholder = (path: string, heading: string, icon: NavItem['icon']) => ({
  path,
  title: `${heading} — Lavio`,
  component: ModulePlaceholder,
  data: { heading, icon },
});

export const appRoutes: Routes = [
  {
    path: 'password',
    title: 'Mot de passe — Lavio',
    canActivate: [sessionGuard('/login')],
    loadComponent: () => import('../auth/change-password').then((m) => m.ChangePassword),
  },
  {
    path: '',
    component: AppShell,
    canActivate: [tenantGuard],
    data: { config: appShellConfig },
    children: [
      placeholder('', 'Tableau de bord', 'home'),
      placeholder('deposits/new', 'Nouveau dépôt', 'plus'),
      ...items
        .filter((i) => i.path !== '/app' && i.path !== '/app/settings')
        .map((i) => placeholder(i.path.replace('/app/', ''), i.label, i.icon)),
      {
        path: 'license',
        title: 'Ma licence — Lavio',
        loadComponent: () => import('./license-page').then((m) => m.LicensePage),
      },
      {
        path: 'settings',
        title: 'Paramètres — Lavio',
        loadComponent: () => import('./menu-page').then((m) => m.MenuPage),
        data: { heading: 'Paramètres', entries: settingsEntries },
      },
      {
        path: 'settings/users',
        title: 'Utilisateurs — Lavio',
        canActivate: [tenantRoleGuard()],
        loadComponent: () => import('./users-page').then((m) => m.UsersPage),
      },
      {
        path: 'settings/audit',
        title: "Journal d'audit — Lavio",
        canActivate: [tenantRoleGuard()],
        loadComponent: () => import('./audit-page').then((m) => m.AuditPage),
      },
      {
        path: 'more',
        title: 'Plus — Lavio',
        loadComponent: () => import('./menu-page').then((m) => m.MenuPage),
        data: { heading: 'Plus', entries: moreEntries },
      },
    ],
  },
];
