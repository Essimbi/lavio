import type { Routes } from '@angular/router';
import { AppShell } from '../../shared/ui/app-shell/app-shell';
import type { NavItem, ShellConfig } from '../../shared/ui/app-shell/nav';
import { ModulePlaceholder } from '../app/module-placeholder';

/** Navigation du superadmin (docs/06, « Interface superadmin »). */
const items: NavItem[] = [
  { label: 'Tableau de bord', path: '/admin', icon: 'home', exact: true },
  { label: 'Pressings', path: '/admin/tenants', icon: 'store' },
  { label: 'Licences', path: '/admin/licenses', icon: 'key' },
  { label: 'Plans', path: '/admin/plans', icon: 'layers' },
  { label: 'Paiements', path: '/admin/payments', icon: 'card' },
  { label: 'Demandes', path: '/admin/leads', icon: 'inbox' },
  { label: 'Relevé mensuel', path: '/admin/statements', icon: 'chart' },
  { label: 'Utilisateurs', path: '/admin/users', icon: 'users' },
  { label: "Journal d'audit", path: '/admin/audit', icon: 'shield' },
  { label: 'Paramètres', path: '/admin/settings', icon: 'settings' },
];

const take = (path: string): NavItem => {
  const item = items.find((i) => i.path === path);
  if (!item) throw new Error(`Entrée de navigation inconnue : ${path}`);
  return item;
};

export const adminShellConfig: ShellConfig = {
  area: 'Superadmin',
  items,
  mobileItems: [
    { ...take('/admin'), label: 'Accueil' },
    take('/admin/tenants'),
    take('/admin/licenses'),
    take('/admin/payments'),
    { label: 'Plus', path: '/admin/more', icon: 'more' },
  ],
};

export const adminRoutes: Routes = [
  {
    path: 'login',
    title: 'Connexion superadmin — Lavio',
    loadComponent: () => import('../auth/login').then((m) => m.Login),
  },
  {
    path: '',
    component: AppShell,
    data: { config: adminShellConfig },
    children: [
      ...items.map((i) => ({
        path: i.path === '/admin' ? '' : i.path.replace('/admin/', ''),
        title: `${i.label} — Lavio`,
        component: ModulePlaceholder,
        data: { heading: i.label, icon: i.icon },
      })),
      {
        path: 'more',
        title: 'Plus — Lavio',
        component: ModulePlaceholder,
        data: { heading: 'Plus', icon: 'more' },
      },
    ],
  },
];
