import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { REPORT_TITLES, type ReportCell, type ReportColumn, ReportKey } from '@lavio/shared';
import { ManagementApi } from '../../../core/api/management-api';
import { formatDate, formatDateTime, formatXaf, todayInput } from '../../../shared/format/format';
import { formatQty, saveBlob } from '../../../shared/format/labels';
import { Toast } from '../../../shared/ui/toast/toast.service';

/** Rapports à date (sans période). */
const SNAPSHOTS: ReadonlySet<ReportKey> = new Set(['receivables', 'stock-valuation']);

/**
 * Rapports (docs/05, règle 7) : l'écran affiche la structure renvoyée par l'API ; les exports
 * CSV et XLSX sont produits par l'API à partir de la même structure (mêmes chiffres).
 */
@Component({
  selector: 'lv-reports-panel',
  imports: [FormsModule],
  template: `
    <div class="mb-4 flex flex-wrap gap-2" role="group" aria-label="Choix du rapport">
      @for (k of keys; track k) {
        <button
          type="button"
          class="lv-choice"
          [attr.aria-pressed]="key() === k"
          [class.bg-mint-100]="key() === k"
          (click)="key.set(k)"
        >
          {{ titles[k] }}
        </button>
      }
    </div>
    <form class="mb-6 flex flex-wrap items-end gap-3" (ngSubmit)="report.reload()">
      @if (!snapshot()) {
        <div>
          <label class="lv-label" for="rep-from">Du</label>
          <input
            id="rep-from"
            class="lv-input"
            type="date"
            name="from"
            [ngModel]="from()"
            (ngModelChange)="from.set($event)"
          />
        </div>
        <div>
          <label class="lv-label" for="rep-to">Au</label>
          <input
            id="rep-to"
            class="lv-input"
            type="date"
            name="to"
            [ngModel]="to()"
            (ngModelChange)="to.set($event)"
          />
        </div>
      } @else {
        <p class="min-h-11 content-center">Situation à l’instant présent.</p>
      }
      <button type="button" class="lv-secondary" [disabled]="exporting()" (click)="download('csv')">
        Exporter en CSV
      </button>
      <button
        type="button"
        class="lv-secondary"
        [disabled]="exporting()"
        (click)="download('xlsx')"
      >
        Exporter en Excel
      </button>
    </form>

    @if (report.hasValue()) {
      @let r = report.value();
      <h2 class="mb-3 text-xl">{{ r.title }}</h2>
      <div class="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        @for (s of r.summary; track s.label) {
          <div class="lv-card">
            <p class="text-sm">{{ s.label }}</p>
            <p class="tabular text-2xl font-semibold" [class.text-coral-600]="s.valueXaf < 0">
              {{ xaf(s.valueXaf) }}
            </p>
          </div>
        }
      </div>
      @for (t of r.tables; track t.title) {
        <section class="mb-8" [attr.aria-label]="t.title">
          <h3 class="mb-2 text-lg">{{ t.title }}</h3>
          <div class="lv-table-wrap">
            <table class="lv-table">
              <caption class="sr-only">
                {{
                  t.title
                }}
              </caption>
              <thead>
                <tr>
                  @for (c of t.columns; track c.key) {
                    <th scope="col" [class.num]="isNumeric(c)">{{ c.label }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of t.rows; track $index) {
                  <tr>
                    @for (c of t.columns; track c.key) {
                      <td
                        [class.num]="isNumeric(c)"
                        [class.text-coral-600]="isNegative(row[c.key])"
                      >
                        {{ cell(c, row[c.key]) }}
                      </td>
                    }
                  </tr>
                } @empty {
                  <tr>
                    <td [attr.colspan]="t.columns.length">Aucune donnée sur la période.</td>
                  </tr>
                }
              </tbody>
              @if (t.totals; as totals) {
                <tfoot>
                  <tr>
                    @for (c of t.columns; track c.key) {
                      <td [class.num]="isNumeric(c)" class="font-semibold">
                        {{ cell(c, totals[c.key]) }}
                      </td>
                    }
                  </tr>
                </tfoot>
              }
            </table>
          </div>
        </section>
      }
    } @else if (report.error()) {
      <p class="lv-alert" role="alert">{{ errorText() }}</p>
    } @else {
      <p aria-busy="true">Chargement…</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPanel {
  private readonly api = inject(ManagementApi);
  private readonly toast = inject(Toast);
  protected readonly keys = Object.keys(ReportKey) as ReportKey[];
  protected readonly titles = REPORT_TITLES;
  protected readonly key = signal<ReportKey>('revenue');
  protected readonly from = signal(`${todayInput().slice(0, 8)}01`);
  protected readonly to = signal(todayInput());
  protected readonly exporting = signal(false);
  protected readonly snapshot = computed(() => SNAPSHOTS.has(this.key()));
  private readonly period = computed(() =>
    this.snapshot()
      ? { from: undefined, to: undefined }
      : { from: this.from() || undefined, to: this.to() || undefined },
  );
  protected readonly report = resource({
    params: () => ({ key: this.key(), ...this.period() }),
    loader: ({ params }) => this.api.report(params.key, params.from, params.to),
  });
  protected readonly errorText = computed(() => {
    const e = this.report.error() as { message?: string } | undefined;
    return e?.message ?? 'Rapport indisponible.';
  });

  protected readonly xaf = formatXaf;
  protected readonly isNumeric = (c: ReportColumn) => c.type === 'xaf' || c.type === 'qty';
  protected readonly isNegative = (v: ReportCell | undefined) => typeof v === 'number' && v < 0;

  /** Même mise en forme que les exports : dates françaises, montants en FCFA. */
  protected cell(c: ReportColumn, value: ReportCell | undefined): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return c.type === 'xaf' ? formatXaf(value) : formatQty(value);
    // Libellés (« Total ») dans une colonne de dates : affichés tels quels, comme dans les exports.
    if (c.type === 'date' && /^\d{4}-\d{2}-\d{2}/.test(value)) return formatDate(value);
    if (c.type === 'datetime' && !Number.isNaN(Date.parse(value))) return formatDateTime(value);
    return value;
  }

  protected async download(format: 'csv' | 'xlsx'): Promise<void> {
    this.exporting.set(true);
    try {
      const p = this.period();
      const blob = await this.api.reportFile(this.key(), format, p.from, p.to);
      saveBlob(blob, `lavio-${this.key()}${p.from ? `-${p.from}-${p.to ?? ''}` : ''}.${format}`);
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.exporting.set(false);
    }
  }
}
