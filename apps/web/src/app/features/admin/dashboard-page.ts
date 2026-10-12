import { ChangeDetectionStrategy, Component, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApi } from '../../core/api/admin-api';
import { XafPipe } from '../../shared/format/format';
import { PageHeader } from '../../shared/ui/page-header/page-header';

/** Tableau de bord du superadmin (docs/06). */
@Component({
  selector: 'lv-admin-dashboard',
  imports: [PageHeader, RouterLink, XafPipe],
  template: `
    <lv-page-header heading="Tableau de bord" subtitle="La plateforme Lavio en un coup d’œil." />
    @if (data.hasValue()) {
      @let d = data.value();
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <a class="kpi" routerLink="/admin/tenants"
          ><span class="kpi-value">{{ d.activeTenants }}</span
          ><span>Pressings actifs</span></a
        >
        <a class="kpi" routerLink="/admin/licenses" [queryParams]="{ bientot: 15 }">
          <span class="kpi-value">{{ d.licensesExpiringSoon }}</span
          ><span>Licences expirant sous 15 jours</span>
        </a>
        <a class="kpi" routerLink="/admin/licenses" [queryParams]="{ statut: 'GRACE' }">
          <span class="kpi-value">{{ d.licensesInGrace }}</span
          ><span>Licences en grâce</span>
        </a>
        <a class="kpi" routerLink="/admin/leads"
          ><span class="kpi-value">{{ d.newLeads }}</span
          ><span>Nouvelles demandes</span></a
        >
        <a class="kpi" routerLink="/admin/statements"
          ><span class="kpi-value tabular">{{ d.monthCollectedXaf | xaf }}</span
          ><span>Encaissé ce mois-ci ({{ d.month }})</span></a
        >
        <div class="kpi">
          <span class="kpi-split tabular"
            ><strong>{{ d.designerShareXaf | xaf }}</strong> Concepteur</span
          >
          <span class="kpi-split tabular"
            ><strong>{{ d.operatorShareXaf | xaf }}</strong> Exploitant</span
          >
          <span>Parts du mois</span>
        </div>
      </div>
    } @else if (data.error()) {
      <p class="lv-alert" role="alert">Impossible de charger le tableau de bord.</p>
    } @else {
      <p aria-busy="true">Chargement…</p>
    }
  `,
  styles: `
    .kpi {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 20px;
      border-radius: var(--lv-radius-card);
      background: var(--lv-white);
      box-shadow: var(--lv-shadow-card);
      color: var(--lv-ink-900);
      text-decoration: none;
      transition: transform var(--lv-duration) var(--lv-ease);
    }
    a.kpi:hover {
      transform: translateY(-2px);
    }
    .kpi-value {
      font: 600 32px/1.1 var(--lv-font-display);
      color: var(--lv-teal-900);
    }
    .kpi-split strong {
      font-family: var(--lv-font-display);
      color: var(--lv-teal-900);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPage {
  private readonly api = inject(AdminApi);
  protected readonly data = resource({ loader: () => this.api.dashboard() });
}
