import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  resource,
  ViewEncapsulation,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PressingApi } from '../../core/api/pressing-api';
import { FrDatePipe, FrDateTimePipe, PhonePipe, XafPipe } from '../../shared/format/format';
import { errorMessage } from '../../shared/ui/toast/toast.service';
import { qrDataUrl } from './qr';

/**
 * Ticket thermique 80 mm (docs/09) : impression par le navigateur, texte noir sur blanc,
 * numéro en grand et en toutes lettres, QR code de 28 mm.
 */
@Component({
  selector: 'lv-print-ticket',
  imports: [RouterLink, XafPipe, FrDatePipe, FrDateTimePipe, PhonePipe],
  template: `
    <div class="print-toolbar no-print">
      <a class="lv-link-button" [routerLink]="['/app/deposits', id()]">Retour au dépôt</a>
      <button type="button" class="lv-primary" (click)="print()">Imprimer le ticket</button>
      <a class="lv-secondary" [routerLink]="['/print/labels', id()]">Étiquettes</a>
      <a class="lv-secondary" routerLink="/app/deposits/new">Nouveau dépôt</a>
    </div>

    @if (ticket.hasValue()) {
      @let t = ticket.value();
      <article class="ticket" aria-label="Ticket de dépôt">
        @if (t.tenant.logoUrl) {
          <img class="ticket-logo" [src]="t.tenant.logoUrl" alt="" />
        } @else {
          <img class="ticket-logo" src="brand/lavio-logo-horizontal.svg" alt="" />
        }
        <p class="center strong">{{ t.tenant.name }}</p>
        @if (t.tenant.address || t.tenant.city) {
          <p class="center small">{{ t.tenant.address }} {{ t.tenant.city }}</p>
        }
        @if (t.tenant.phone) {
          <p class="center small">{{ t.tenant.phone | phone }}</p>
        }
        <p class="center caps">Ticket de dépôt</p>
        <p class="number">N° {{ t.ticketNumber }}</p>
        <p class="center words">{{ t.numberInWords }}</p>
        <hr />
        <p>Déposé le {{ t.receivedAt | frDateTime }}</p>
        <p>
          <strong>{{ t.customer.name }}</strong> · {{ t.customer.phone | phone }}
        </p>
        <hr />
        <table>
          <tbody>
            @for (l of t.lines; track $index) {
              <tr>
                <td>
                  {{ l.quantity }} × {{ l.itemType }}<br /><span class="small">{{
                    l.service
                  }}</span>
                </td>
                <td class="right">{{ l.totalXaf | xaf }}</td>
              </tr>
            }
          </tbody>
        </table>
        <hr />
        <table>
          <tbody>
            @if (t.expressSurchargeXaf || t.discountXaf) {
              <tr>
                <td>Sous-total</td>
                <td class="right">{{ t.subtotalXaf | xaf }}</td>
              </tr>
            }
            @if (t.expressSurchargeXaf) {
              <tr>
                <td>Express</td>
                <td class="right">{{ t.expressSurchargeXaf | xaf }}</td>
              </tr>
            }
            @if (t.discountXaf) {
              <tr>
                <td>Remise</td>
                <td class="right">− {{ t.discountXaf | xaf }}</td>
              </tr>
            }
            <tr class="strong">
              <td>Total</td>
              <td class="right">{{ t.totalXaf | xaf }}</td>
            </tr>
            <tr>
              <td>Acompte</td>
              <td class="right">{{ t.paidXaf | xaf }}</td>
            </tr>
            <tr class="strong">
              <td>Reste à payer</td>
              <td class="right">{{ t.balanceXaf | xaf }}</td>
            </tr>
          </tbody>
        </table>
        <hr />
        <p class="center strong">Retrait prévu le {{ t.dueDate | frDate }}</p>
        @if (qr.hasValue()) {
          <img class="qr" [src]="qr.value()" alt="QR code du ticket" />
        }
        @if (t.tenant.footer) {
          <p class="center small">{{ t.tenant.footer }}</p>
        }
        <p class="center strong">Présentez ce ticket au retrait</p>
        <p class="center tiny">Vos données sont utilisées pour la gestion de votre dépôt.</p>
      </article>
    } @else if (ticket.error()) {
      <p class="lv-alert m-6" role="alert">{{ message(ticket.error()) }}</p>
    } @else {
      <p class="m-6" aria-busy="true">Préparation du ticket…</p>
    }
  `,
  styleUrl: './ticket.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintTicket {
  readonly id = input.required<string>();
  /** `?auto=1` : impression lancée dès que le ticket est prêt. */
  readonly auto = input<string>();
  private readonly api = inject(PressingApi);
  protected readonly ticket = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.ticket(params),
  });
  protected readonly qr = resource({
    params: () => (this.ticket.hasValue() ? this.ticket.value().qrPayload : undefined),
    loader: ({ params }) => qrDataUrl(params),
  });
  protected readonly message = errorMessage;
  private printed = false;

  constructor() {
    effect(() => {
      if (this.auto() && this.qr.hasValue() && !this.printed) {
        this.printed = true;
        setTimeout(() => this.print(), 250);
      }
    });
  }

  protected print(): void {
    window.print();
  }
}
