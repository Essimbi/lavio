import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  ViewEncapsulation,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ManagementApi } from '../../core/api/management-api';
import { AuthService } from '../../core/auth/auth.service';
import { FrDatePipe, PhonePipe, XafPipe } from '../../shared/format/format';
import { errorMessage } from '../../shared/ui/toast/toast.service';

/** Liste de tournée du jour (docs/09, A4) : adresse, téléphone, contenu, montant à encaisser. */
@Component({
  selector: 'lv-print-tours',
  imports: [RouterLink, FrDatePipe, PhonePipe, XafPipe],
  template: `
    <div class="print-toolbar no-print">
      <a class="lv-link-button" routerLink="/app/tours" [queryParams]="{ date: date() }"
        >Retour aux tournées</a
      >
      <button type="button" class="lv-primary" (click)="print()">Imprimer</button>
    </div>
    @if (day.hasValue()) {
      @let d = day.value();
      <article class="sheet" aria-label="Liste de tournée">
        <header>
          <h1>Tournée du {{ d.date | frDate }}</h1>
          <p>
            {{ auth.tenant()?.name }} · {{ open().length }} arrêt(s) · à encaisser :
            <strong>{{ d.totalToCollectXaf | xaf }}</strong>
          </p>
        </header>
        <table>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Type</th>
              <th scope="col">Client</th>
              <th scope="col">Adresse</th>
              <th scope="col">Contenu</th>
              <th scope="col" class="num">À encaisser</th>
              <th scope="col">Fait</th>
            </tr>
          </thead>
          <tbody>
            @for (r of open(); track r.id; let i = $index) {
              <tr>
                <td>{{ i + 1 }}</td>
                <td>{{ r.type === 'PICKUP' ? 'Ramassage' : 'Livraison' }}</td>
                <td>
                  <strong>{{ r.customerName }}</strong
                  ><br />{{ r.customerPhone | phone }}
                </td>
                <td>
                  {{ r.address }}
                  @if (r.notes) {
                    <br /><em>{{ r.notes }}</em>
                  }
                </td>
                <td>
                  {{
                    r.ticketNumber
                      ? 'Dépôt n° ' + r.ticketNumber + ' · ' + r.itemCount + ' article(s)'
                      : '—'
                  }}
                </td>
                <td class="num">{{ r.amountToCollectXaf ? (r.amountToCollectXaf | xaf) : '—' }}</td>
                <td class="check" aria-label="Case à cocher"></td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7">Aucune demande pour ce jour.</td>
              </tr>
            }
          </tbody>
        </table>
      </article>
    } @else if (day.error()) {
      <p class="lv-alert m-6" role="alert">{{ message(day.error()) }}</p>
    } @else {
      <p class="m-6" aria-busy="true">Préparation de la liste…</p>
    }
  `,
  styles: `
    @page {
      size: A4;
      margin: 12mm;
    }
    lv-print-tours {
      display: block;
      min-height: 100dvh;
      background: var(--lv-foam-50);
    }
    lv-print-tours .print-toolbar {
      display: flex;
      gap: 8px;
      justify-content: center;
      padding: 16px;
    }
    lv-print-tours .sheet {
      max-width: 190mm;
      margin: 0 auto 32px;
      padding: 10mm;
      background: #fff;
      color: #000;
      font: 400 12px/1.4 var(--lv-font-body);
      box-shadow: var(--lv-shadow-card);
    }
    lv-print-tours h1 {
      margin: 0 0 4px;
      font: 700 20px/1.2 var(--lv-font-display);
    }
    lv-print-tours table {
      width: 100%;
      margin-top: 8mm;
      border-collapse: collapse;
    }
    lv-print-tours th,
    lv-print-tours td {
      padding: 6px;
      border: 1px solid #000;
      text-align: left;
      vertical-align: top;
    }
    lv-print-tours .num {
      text-align: right;
      white-space: nowrap;
    }
    lv-print-tours .check {
      width: 14mm;
    }
    @media print {
      .no-print,
      lv-license-banner {
        display: none !important;
      }
      lv-print-tours,
      lv-print-tours .sheet {
        background: #fff;
        box-shadow: none;
        margin: 0;
        padding: 0;
        max-width: none;
      }
    }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintTours {
  readonly date = input.required<string>();
  private readonly api = inject(ManagementApi);
  protected readonly auth = inject(AuthService);
  protected readonly day = resource({
    params: () => this.date(),
    loader: ({ params }) => this.api.tourDay(params),
  });
  protected readonly open = computed(() =>
    this.day.hasValue() ? this.day.value().requests.filter((r) => r.status !== 'CANCELLED') : [],
  );
  protected readonly message = errorMessage;

  protected print(): void {
    window.print();
  }
}
