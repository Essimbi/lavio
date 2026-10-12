import type { Routes } from '@angular/router';
import { tenantGuard } from '../../core/auth/guards';

/** Impressions (hors coquille de l'application) : ticket 80 mm et étiquettes. */
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
];
