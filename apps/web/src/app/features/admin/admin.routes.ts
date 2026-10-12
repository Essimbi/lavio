import type { Routes } from '@angular/router';
import { platformGuard, platformRoleGuard, sessionGuard } from '../../core/auth/guards';
import { AppShell } from '../../shared/ui/app-shell/app-shell';
import type { NavItem, ShellConfig } from '../../shared/ui/app-shell/nav';
import type { MenuEntry } from '../app/menu-page';

const SUPER: NavItem['platformRoles'] = ['SUPER_ADMIN'];

/** Navigation du superadmin (docs/06, « Interface superadmin »). */
const items: NavItem[] = [
  { label: 'Tableau de bord', path: '/admin', icon: 'home', exact: true },
  { label: 'Pressings', path: '/admin/tenants', icon: 'store' },
  { label: 'Licences', path: '/admin/licenses', icon: 'key' },
  { label: 'Plans', path: '/admin/plans', icon: 'layers' },
  { label: 'Paiements', path: '/admin/payments', icon: 'card' },
  { label: 'Demandes', path: '/admin/leads', icon: 'inbox', platformRoles: SUPER },
  { label: 'Relevé mensuel', path: '/admin/statements', icon: 'chart' },
  { label: 'Utilisateurs', path: '/admin/users', icon: 'users', platformRoles: SUPER },
  { label: "Journal d'audit", path: '/admin/audit', icon: 'shield', platformRoles: SUPER },
  { label: 'Paramètres', path: '/admin/settings', icon: 'settings', platformRoles: SUPER },
];

const take = (path: string): NavItem => {
  const item = items.find((i) => i.path === path);
  if (!item) throw new Error(`Entrée de navigation inconnue : ${path}`);
  return item;
};

export const adminShellConfig: ShellConfig = {
  area: 'Superadmin',
  loginPath: '/admin/login',
  items,
  mobileItems: [
    { ...take('/admin'), label: 'Accueil' },
    take('/admin/tenants'),
    take('/admin/licenses'),
    take('/admin/payments'),
    { label: 'Plus', path: '/admin/more', icon: 'more' },
  ],
};

const moreEntries: MenuEntry[] = [
  { label: 'Plans', description: 'Offres et prix.', path: '/admin/plans', icon: 'layers' },
  {
    label: 'Relevé mensuel',
    description: 'Partage des revenus et exports.',
    path: '/admin/statements',
    icon: 'chart',
  },
  {
    label: 'Demandes',
    description: 'Prospects de la landing.',
    path: '/admin/leads',
    icon: 'inbox',
    superAdminOnly: true,
  },
  {
    label: 'Utilisateurs',
    description: 'Accès au superadmin.',
    path: '/admin/users',
    icon: 'users',
    superAdminOnly: true,
  },
  {
    label: "Journal d'audit",
    description: 'Actions sensibles.',
    path: '/admin/audit',
    icon: 'shield',
    superAdminOnly: true,
  },
  {
    label: 'Paramètres',
    description: 'WhatsApp, partage, essai, grâce.',
    path: '/admin/settings',
    icon: 'settings',
    superAdminOnly: true,
  },
  {
    label: 'Mot de passe',
    description: 'Changer votre mot de passe.',
    path: '/admin/password',
    icon: 'key',
  },
];

const page = (
  path: string,
  title: string,
  load: () => Promise<unknown>,
  extra: Partial<Routes[number]> = {},
) => ({
  path,
  title: `${title} — Lavio`,
  loadComponent: load as Routes[number]['loadComponent'],
  ...extra,
});

export const adminRoutes: Routes = [
  {
    path: 'login',
    title: 'Connexion superadmin — Lavio',
    data: { area: 'admin' },
    loadComponent: () => import('../auth/login').then((m) => m.Login),
  },
  {
    path: 'password',
    title: 'Mot de passe — Lavio',
    canActivate: [sessionGuard('/admin/login')],
    loadComponent: () => import('../auth/change-password').then((m) => m.ChangePassword),
  },
  {
    path: '',
    component: AppShell,
    canActivate: [platformGuard],
    data: { config: adminShellConfig },
    children: [
      page('', 'Tableau de bord', () =>
        import('./dashboard-page').then((m) => m.AdminDashboardPage),
      ),
      page('tenants', 'Pressings', () => import('./tenants-page').then((m) => m.TenantsPage)),
      page('tenants/:id', 'Pressing', () =>
        import('./tenant-detail-page').then((m) => m.TenantDetailPage),
      ),
      page('licenses', 'Licences', () => import('./licenses-pages').then((m) => m.LicensesPage)),
      page('licenses/:id', 'Licence', () =>
        import('./licenses-pages').then((m) => m.LicenseDetailPage),
      ),
      page('plans', 'Plans', () => import('./plans-page').then((m) => m.PlansPage)),
      page('payments', 'Paiements', () => import('./payments-page').then((m) => m.PaymentsPage)),
      page('statements', 'Relevé mensuel', () =>
        import('./statements-page').then((m) => m.StatementsPage),
      ),
      page('leads', 'Demandes', () => import('./leads-page').then((m) => m.LeadsPage), {
        canActivate: [platformRoleGuard('SUPER_ADMIN')],
      }),
      page(
        'users',
        'Utilisateurs plateforme',
        () => import('./platform-users-page').then((m) => m.PlatformUsersPage),
        {
          canActivate: [platformRoleGuard('SUPER_ADMIN')],
        },
      ),
      page(
        'audit',
        "Journal d'audit",
        () => import('./audit-admin-page').then((m) => m.AdminAuditPage),
        {
          canActivate: [platformRoleGuard('SUPER_ADMIN')],
        },
      ),
      page(
        'settings',
        'Paramètres',
        () => import('./settings-page').then((m) => m.AdminSettingsPage),
        {
          canActivate: [platformRoleGuard('SUPER_ADMIN')],
        },
      ),
      page('more', 'Plus', () => import('../app/menu-page').then((m) => m.MenuPage), {
        data: { heading: 'Plus', entries: moreEntries, loginPath: '/admin/login' },
      }),
    ],
  },
];
