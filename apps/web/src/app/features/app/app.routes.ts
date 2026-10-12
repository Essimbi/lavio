import type { Routes } from '@angular/router';
import { AppShell } from '../../shared/ui/app-shell/app-shell';
import type { NavItem, ShellConfig } from '../../shared/ui/app-shell/nav';
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

const placeholder = (path: string, heading: string, icon: NavItem['icon']) => ({
  path,
  title: `${heading} — Lavio`,
  component: ModulePlaceholder,
  data: { heading, icon },
});

export const appRoutes: Routes = [
  {
    path: '',
    component: AppShell,
    data: { config: appShellConfig },
    children: [
      placeholder('', 'Tableau de bord', 'home'),
      placeholder('deposits/new', 'Nouveau dépôt', 'plus'),
      ...items
        .filter((i) => i.path !== '/app')
        .map((i) => placeholder(i.path.replace('/app/', ''), i.label, i.icon)),
      placeholder('more', 'Plus', 'more'),
    ],
  },
];
