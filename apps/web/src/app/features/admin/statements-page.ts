import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { AdminApi } from '../../core/api/admin-api';
import { FrDatePipe, XafPipe } from '../../shared/format/format';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Toast } from '../../shared/ui/toast/toast.service';

const currentMonth = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Douala',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date());

/** Relevé mensuel de partage des revenus 50/50 (docs/06), exportable en CSV, XLSX et PDF. */
@Component({
  selector: 'lv-statements-page',
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    PageHeader,
    FrDatePipe,
    XafPipe,
  ],
  template: `
    <lv-page-header
      heading="Relevé mensuel"
      subtitle="Partage des revenus des abonnements, calculé à partir des paiements."
    >
      @for (f of formats; track f) {
        <button mat-stroked-button type="button" (click)="download(f)" [disabled]="downloading()">
          Exporter en {{ f.toUpperCase() }}
        </button>
      }
    </lv-page-header>
    <mat-form-field>
      <mat-label>Mois</mat-label>
      <input matInput type="month" [ngModel]="month()" (ngModelChange)="month.set($event)" />
    </mat-form-field>

    @if (statement.hasValue()) {
      @let s = statement.value();
      <div class="lv-table-wrap mt-2">
        <table class="lv-table">
          <caption class="sr-only">
            Relevé du mois
            {{
              s.month
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">Pressing</th>
              <th scope="col">Plan</th>
              <th scope="col">Période</th>
              <th scope="col" class="num">Montant encaissé</th>
              <th scope="col" class="num">Déductions</th>
              <th scope="col" class="num">Revenu partageable</th>
            </tr>
          </thead>
          <tbody>
            @for (r of s.rows; track r.tenantId) {
              <tr>
                <td>{{ r.tenantName }}</td>
                <td>{{ r.planNames.join(', ') }}</td>
                <td>{{ r.periodStart | frDate }} – {{ r.periodEnd | frDate }}</td>
                <td class="num">{{ r.collectedXaf | xaf }}</td>
                <td class="num">{{ r.deductionsXaf | xaf }}</td>
                <td class="num">{{ r.shareableXaf | xaf }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6">Aucun paiement ce mois-ci.</td>
              </tr>
            }
          </tbody>
          <tfoot>
            <tr class="font-semibold">
              <th scope="row" colspan="3" class="text-left">Total</th>
              <td class="num">{{ s.totals.collectedXaf | xaf }}</td>
              <td class="num">{{ s.totals.deductionsXaf | xaf }}</td>
              <td class="num">{{ s.totals.shareableXaf | xaf }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <div class="lv-card">
          <p class="text-sm">Part du Concepteur ({{ s.shareRatePercent }} %)</p>
          <p class="tabular text-2xl font-semibold text-teal-900">
            {{ s.totals.designerShareXaf | xaf }}
          </p>
        </div>
        <div class="lv-card">
          <p class="text-sm">Part de l’Exploitant ({{ 100 - s.shareRatePercent }} %)</p>
          <p class="tabular text-2xl font-semibold text-teal-900">
            {{ s.totals.operatorShareXaf | xaf }}
          </p>
        </div>
      </div>
    } @else if (statement.error()) {
      <p class="lv-alert" role="alert">Impossible de calculer ce relevé.</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatementsPage {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(Toast);
  protected readonly formats = ['csv', 'xlsx', 'pdf'] as const;
  protected readonly month = signal(currentMonth());
  protected readonly downloading = signal(false);
  protected readonly statement = resource({
    params: () => this.month() || undefined,
    loader: ({ params }) => this.api.statement(params),
  });

  protected async download(format: 'csv' | 'xlsx' | 'pdf'): Promise<void> {
    this.downloading.set(true);
    try {
      const blob = await firstValueFrom(this.api.exportStatement(this.month(), format));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lavio-releve-${this.month()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.downloading.set(false);
    }
  }
}
