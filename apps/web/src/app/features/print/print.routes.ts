import type { Routes } from '@angular/router';
import { tenantGuard } from '../../core/auth/guards';

/** Impressions (hors coquille de l'application) : ticket et reçu 80 mm, étiquettes. */
export const printRoutes: Routes = [
  {
    path: 'ticket/:id',
    title: 'Ticket — Lavio',
    canActivate: [tenantGuard],
    loadComponent: () => import('./print-ticket').then((m) => m.PrintTicket),
  },
  {
    path: 'labels/:id',
    title: 'Étiquettes — Lavio',
    canActivate: [tenantGuard],
    loadComponent: () => import('./print-labels').then((m) => m.PrintLabels),
  },
  {
    path: 'receipt/:id',
    title: 'Reçu — Lavio',
    canActivate: [tenantGuard],
    loadComponent: () => import('./print-receipt').then((m) => m.PrintReceipt),
  },
];
