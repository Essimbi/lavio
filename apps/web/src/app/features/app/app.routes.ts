import type { Routes } from '@angular/router';
import type { TenantRole } from '@lavio/shared';
import { sessionGuard, tenantGuard, tenantRoleGuard } from '../../core/auth/guards';
import { AppShell } from '../../shared/ui/app-shell/app-shell';
import type { NavItem, ShellConfig } from '../../shared/ui/app-shell/nav';
import type { MenuEntry } from './menu-page';
import { ModulePlaceholder } from './module-placeholder';

/** Rôles des écrans de suivi et d'argent (docs/05, matrice des droits). */
const TRACKING_ROLES: TenantRole[] = ['OPERATOR', 'QUALITY', 'CASHIER'];
const MONEY_ROLES: TenantRole[] = ['CASHIER', 'ACCOUNTANT'];

/** Navigation de l'application du pressing (docs/08, « Navigation »). */
const items: NavItem[] = [
  { label: 'Tableau de bord', path: '/app', icon: 'home', exact: true },
  {
    label: 'Validations',
    path: '/app/approvals',
    icon: 'shield',
    tenantRoles: [],
    badge: 'approvals',
  },
  { label: 'Dépôts', path: '/app/deposits', icon: 'ticket' },
  { label: 'Clients', path: '/app/customers', icon: 'users' },
  { label: 'Suivi', path: '/app/tracking', icon: 'track', tenantRoles: TRACKING_ROLES },
  { label: 'Caisse', path: '/app/cash', icon: 'cash', tenantRoles: MONEY_ROLES },
  { label: 'Paiements', path: '/app/payments', icon: 'card', tenantRoles: MONEY_ROLES },
  { label: 'Stock', path: '/app/stock', icon: 'box' },
  { label: 'Achats', path: '/app/purchasing', icon: 'cart' },
  { label: 'Dépenses', path: '/app/expenses', icon: 'receipt' },
  { label: 'Comptabilité', path: '/app/accounting', icon: 'chart' },
  { label: 'Tournées', path: '/app/tours', icon: 'truck' },
  { label: 'Notifications', path: '/app/notifications', icon: 'bell', badge: 'notifications' },
  { label: 'Paramètres', path: '/app/settings', icon: 'settings' },
];

/** Écrans réalisés (les autres modules restent des emplacements réservés). */
const BUILT = [
  '/app',
  '/app/approvals',
  '/app/deposits',
  '/app/customers',
  '/app/tracking',
  '/app/cash',
  '/app/payments',
  '/app/notifications',
  '/app/settings',
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
  notifications: true,
  items,
  mobileItems: [
    { ...byPath('/app'), label: 'Accueil' },
    { ...byPath('/app/deposits'), label: 'Activité' },
    byPath('/app/cash'),
    byPath('/app/stock'),
    { label: 'Plus', path: '/app/more', icon: 'more', badge: 'all' },
  ],
  primaryAction: { label: 'Nouveau dépôt', path: '/app/deposits/new', icon: 'plus' },
};

const settingsEntries: MenuEntry[] = [
  {
    label: 'Catalogue et tarifs',
    description: 'Articles, services, grille de prix.',
    path: '/app/settings/catalog',
    icon: 'layers',
    ownerOnly: true,
  },
  {
    label: 'Causes de reprise',
    description: 'Motifs des reprises et incidents.',
    path: '/app/settings/rework-causes',
    icon: 'track',
    ownerOnly: true,
  },
  {
    label: 'Pressing',
    description: 'Ticket, TVA, tournées, seuils.',
    path: '/app/settings/pressing',
    icon: 'store',
    ownerOnly: true,
  },
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

const moreEntries: MenuEntry[] = [
  {
    label: 'Validations',
    description: 'Remises, crédits et clôtures de caisse.',
    path: '/app/approvals',
    icon: 'shield',
    ownerOnly: true,
  },
  {
    label: 'Notifications',
    description: 'Alertes et demandes récentes.',
    path: '/app/notifications',
    icon: 'bell',
  },
  {
    label: 'Suivi',
    description: 'Statuts, contrôle qualité, reprises.',
    path: '/app/tracking',
    icon: 'track',
    tenantRoles: TRACKING_ROLES,
  },
  {
    label: 'Paiements',
    description: 'Rapprochement Mobile Money, créances.',
    path: '/app/payments',
    icon: 'card',
    tenantRoles: MONEY_ROLES,
  },
  { label: 'Clients', description: 'Fiches et historique.', path: '/app/customers', icon: 'users' },
  ...settingsEntries,
];

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
      {
        path: 'deposits/new',
        title: 'Nouveau dépôt — Lavio',
        canActivate: [tenantRoleGuard('CASHIER')],
        loadComponent: () => import('./deposits/new-deposit').then((m) => m.NewDeposit),
      },
      {
        path: 'deposits',
        title: 'Dépôts — Lavio',
        loadComponent: () => import('./deposits/deposits-page').then((m) => m.DepositsPage),
      },
      {
        path: 'deposits/:id',
        title: 'Dépôt — Lavio',
        loadComponent: () => import('./deposits/deposit-detail').then((m) => m.DepositDetail),
      },
      {
        path: 'customers',
        title: 'Clients — Lavio',
        loadComponent: () => import('./customers/customers-page').then((m) => m.CustomersPage),
      },
      {
        path: 'customers/:id',
        title: 'Client — Lavio',
        loadComponent: () => import('./customers/customer-detail').then((m) => m.CustomerDetail),
      },
      {
        path: 'approvals',
        title: 'Validations — Lavio',
        canActivate: [tenantRoleGuard()],
        loadComponent: () => import('./approvals-page').then((m) => m.ApprovalsPage),
      },
      {
        path: 'tracking',
        title: 'Suivi — Lavio',
        canActivate: [tenantRoleGuard(...TRACKING_ROLES)],
        loadComponent: () => import('./tracking/tracking-page').then((m) => m.TrackingPage),
      },
      {
        path: 'cash',
        title: 'Caisse — Lavio',
        canActivate: [tenantRoleGuard(...MONEY_ROLES)],
        loadComponent: () => import('./cash/cash-page').then((m) => m.CashPage),
      },
      {
        path: 'payments',
        title: 'Paiements — Lavio',
        canActivate: [tenantRoleGuard(...MONEY_ROLES)],
        loadComponent: () => import('./payments/payments-page').then((m) => m.PaymentsPage),
      },
      {
        path: 'notifications',
        title: 'Notifications — Lavio',
        loadComponent: () => import('./notifications-page').then((m) => m.NotificationsPage),
      },
      {
        path: 'settings/rework-causes',
        title: 'Causes de reprise — Lavio',
        canActivate: [tenantRoleGuard()],
        loadComponent: () =>
          import('./settings/rework-causes-page').then((m) => m.ReworkCausesPage),
      },
      {
        path: 'settings/catalog',
        title: 'Catalogue — Lavio',
        canActivate: [tenantRoleGuard()],
        loadComponent: () => import('./settings/catalog-page').then((m) => m.CatalogPage),
      },
      {
        path: 'settings/pressing',
        title: 'Paramètres du pressing — Lavio',
        canActivate: [tenantRoleGuard()],
        loadComponent: () =>
          import('./settings/pressing-settings-page').then((m) => m.PressingSettingsPage),
      },
      ...items
        .filter((i) => !BUILT.includes(i.path))
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
