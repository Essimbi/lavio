import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { DashboardPeriod } from '@lavio/shared';
import { ManagementApi } from '../../../core/api/management-api';
import { AuthService } from '../../../core/auth/auth.service';
import { FrDatePipe, FrDateTimePipe, todayInput, XafPipe } from '../../../shared/format/format';
import { Icon, type IconName } from '../../../shared/ui/icon/icon';

const PERIODS: { key: DashboardPeriod; label: string }[] = [
  { key: 'today', label: 'Aujourd’hui' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'Année' },
  { key: 'custom', label: 'Période' },
];

interface Shortcut {
  label: string;
  description: string;
  path: string;
  icon: IconName;
}

/**
 * Tableau de bord 360° (docs/01, module 9) : responsable et comptable. Les autres rôles voient
 * leurs raccourcis de travail.
 */
@Component({
  selector: 'lv-dashboard-page',
  imports: [FormsModule, RouterLink, XafPipe, FrDatePipe, FrDateTimePipe, Icon],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly api = inject(ManagementApi);
  protected readonly auth = inject(AuthService);
  protected readonly periods = PERIODS;
  protected readonly period = signal<DashboardPeriod>('today');
  protected readonly from = signal(`${todayInput().slice(0, 8)}01`);
  protected readonly to = signal(todayInput());
  protected readonly canSee = computed(() => this.auth.hasTenantRole('ACCOUNTANT'));
  protected readonly firstName = computed(() => this.auth.user()?.fullName.split(' ')[0] ?? '');

  protected readonly data = resource({
    params: () =>
      this.canSee()
        ? {
            period: this.period(),
            from: this.period() === 'custom' ? this.from() : undefined,
            to: this.period() === 'custom' ? this.to() : undefined,
          }
        : undefined,
    loader: ({ params }) => this.api.dashboard(params.period, params.from, params.to),
  });

  /** Raccourcis selon les rôles (docs/05). */
  protected readonly shortcuts = computed<Shortcut[]>(() => {
    const has = (...r: Parameters<AuthService['hasTenantRole']>) => this.auth.hasTenantRole(...r);
    const list: (Shortcut | false)[] = [
      has('CASHIER') && {
        label: 'Enregistrer un dépôt',
        description: 'Client, articles, ticket.',
        path: '/app/deposits/new',
        icon: 'plus',
      },
      has('OPERATOR', 'QUALITY', 'CASHIER') && {
        label: 'Suivi',
        description: 'Statuts et contrôle qualité.',
        path: '/app/tracking',
        icon: 'track',
      },
      has('CASHIER') && {
        label: 'Caisse',
        description: 'Ouverture, journal, clôture.',
        path: '/app/cash',
        icon: 'cash',
      },
      has('CASHIER', 'DRIVER') && {
        label: 'Tournées',
        description: 'Ramassages et livraisons.',
        path: '/app/tours',
        icon: 'truck',
      },
      has('STOCK_KEEPER', 'OPERATOR') && {
        label: 'Stock',
        description: 'Produits et mouvements.',
        path: '/app/stock',
        icon: 'box',
      },
      has('STOCK_KEEPER') && {
        label: 'Achats',
        description: 'Commandes et réceptions.',
        path: '/app/purchasing',
        icon: 'cart',
      },
      {
        label: 'Notifications',
        description: 'Alertes récentes.',
        path: '/app/notifications',
        icon: 'bell',
      },
    ];
    return list.filter((x): x is Shortcut => !!x);
  });

  protected readonly greeting = computed(() => {
    const h = Number(
      new Intl.DateTimeFormat('fr-FR', {
        hour: 'numeric',
        hour12: false,
        timeZone: 'Africa/Douala',
      }).format(new Date()),
    );
    return h < 18 ? 'Bonjour' : 'Bonsoir';
  });
}
