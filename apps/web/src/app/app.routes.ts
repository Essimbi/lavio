import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Lavio — Le pressing, sous contrôle',
    loadComponent: () => import('./features/landing/home').then((m) => m.Home),
  },
  {
    path: 'mentions-legales',
    title: 'Mentions légales — Lavio',
    data: { page: 'mentions' },
    loadComponent: () => import('./features/legal/legal-page').then((m) => m.LegalPage),
  },
  {
    path: 'confidentialite',
    title: 'Politique de confidentialité — Lavio',
    data: { page: 'confidentialite' },
    loadComponent: () => import('./features/legal/legal-page').then((m) => m.LegalPage),
  },
  {
    path: 'login',
    title: 'Connexion — Lavio',
    data: { area: 'app' },
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'invitation',
    title: 'Choisir mon mot de passe — Lavio',
    loadComponent: () => import('./features/auth/invitation').then((m) => m.Invitation),
  },
  {
    path: 'app',
    loadChildren: () => import('./features/app/app.routes').then((m) => m.appRoutes),
  },
  {
    path: 'print',
    loadChildren: () => import('./features/print/print.routes').then((m) => m.printRoutes),
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
