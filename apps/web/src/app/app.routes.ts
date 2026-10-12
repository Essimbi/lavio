import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Lavio — Le pressing, sous contrôle',
    loadComponent: () => import('./features/landing/home').then((m) => m.Home),
  },
  {
    path: 'login',
    title: 'Connexion — Lavio',
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'app',
    loadChildren: () => import('./features/app/app.routes').then((m) => m.appRoutes),
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },
  {
    path: '**',
    title: 'Page introuvable — Lavio',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];
