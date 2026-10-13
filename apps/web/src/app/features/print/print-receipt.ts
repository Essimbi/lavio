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
import { PressingApi } from '../../core/api/pressing-api';
import { FrDateTimePipe, PhonePipe, XafPipe } from '../../shared/format/format';
import { PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS } from '../../shared/format/labels';
import { errorMessage } from '../../shared/ui/toast/toast.service';

/** Reçu thermique 80 mm (docs/09) : paiements, articles restitués, TVA si le pressing est assujetti. */
@Component({
  selector: 'lv-print-receipt',
  imports: [RouterLink, XafPipe, FrDateTimePipe, PhonePipe],
  template: `
    <div class="print-toolbar no-print">
      <a class="lv-link-button" [routerLink]="['/app/deposits', id()]">Retour au dépôt</a>
      <button type="button" class="lv-primary" (click)="print()">Imprimer le reçu</button>
    </div>

    @if (receipt.hasValue()) {
      @let r = receipt.value();
      <article class="ticket" aria-label="Reçu">
        @if (r.tenant.logoUrl) {
          <img class="ticket-logo" [src]="r.tenant.logoUrl" alt="" />
        }
        <p class="center strong">{{ r.tenant.name }}</p>
        @if (r.tenant.address || r.tenant.city) {
          <p class="center small">{{ r.tenant.address }} {{ r.tenant.city }}</p>
        }
        @if (r.tenant.phone) {
          <p class="center small">{{ r.tenant.phone | phone }}</p>
        }
        @if (r.tenant.niu) {
          <p class="center small">NIU {{ r.tenant.niu }}</p>
        }
        <p class="center caps">Reçu</p>
        <p class="number">N° {{ r.ticketNumber }}</p>
        <hr />
        <p>
          <strong>{{ r.customer.name }}</strong> · {{ r.customer.phone | phone }}
        </p>
        @if (r.returnedItems.length) {
          <hr />
          <p class="strong">Articles restitués</p>
          @for (i of r.returnedItems; track i.labelCode) {
            <p class="small">{{ i.labelCode }} · {{ i.label }}</p>
          }
        }
        <hr />
        <table>
          <tbody>
            @for (p of r.payments; track $index) {
              <tr>
                <td>
                  {{ p.receivedAt | frDateTime }}<br /><span class="small"
                    >{{ methods[p.method] }} · {{ kinds[p.kind] }}
                    @if (p.operatorRef) {
                      · {{ p.operatorRef }}
                    }
                  </span>
                </td>
                <td class="right">
                  {{ p.signedAmountXaf < 0 ? '−' : '' }}
                  {{ abs(p.signedAmountXaf) | xaf }}
                </td>
              </tr>
            }
          </tbody>
        </table>
        <hr />
        <table>
          <tbody>
            <tr class="strong">
              <td>Total{{ r.vat ? ' TTC' : '' }}</td>
              <td class="right">{{ r.totalXaf | xaf }}</td>
            </tr>
            @if (r.vat) {
              <tr>
                <td>dont TVA {{ vatRate() }} %</td>
                <td class="right">{{ r.vat.amountXaf | xaf }}</td>
              </tr>
            }
            <tr>
              <td>Payé</td>
              <td class="right">{{ r.paidXaf | xaf }}</td>
            </tr>
            <tr class="strong">
              <td>Reste à payer</td>
              <td class="right">{{ r.balanceXaf | xaf }}</td>
            </tr>
          </tbody>
        </table>
        <hr />
        <p class="center small">Imprimé le {{ r.printedAt | frDateTime }}</p>
        <p class="center strong">Merci de votre confiance</p>
      </article>
    } @else if (receipt.error()) {
      <p class="lv-alert m-6" role="alert">{{ message(receipt.error()) }}</p>
    } @else {
      <p class="m-6" aria-busy="true">Préparation du reçu…</p>
    }
  `,
  styleUrl: './ticket.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintReceipt {
  readonly id = input.required<string>();
  private readonly api = inject(PressingApi);
  protected readonly receipt = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.receipt(params),
  });
  protected readonly methods = PAYMENT_METHOD_LABELS;
  protected readonly kinds = PAYMENT_KIND_LABELS;
  protected readonly message = errorMessage;
  protected readonly abs = Math.abs;
  protected readonly vatRate = computed(() =>
    this.receipt.hasValue() && this.receipt.value().vat
      ? (this.receipt.value().vat?.ratePercent ?? 0).toLocaleString('fr-FR')
      : '',
  );

  protected print(): void {
    window.print();
  }
}
