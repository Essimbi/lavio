import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { ManagementApi } from '../../../core/api/management-api';
import { AuthService } from '../../../core/auth/auth.service';
import { FrDatePipe, FrDateTimePipe, XafPipe } from '../../../shared/format/format';
import { ORDER_STATUS_LABELS, QtyPipe } from '../../../shared/format/labels';
import { confirmAction } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Toast } from '../../../shared/ui/toast/toast.service';

/** Bon de commande : envoi, réception (partielle ou totale), clôture. */
@Component({
  selector: 'lv-order-page',
  imports: [FormsModule, RouterLink, PageHeader, XafPipe, QtyPipe, FrDatePipe, FrDateTimePipe],
  template: `
    @if (order.hasValue()) {
      @let o = order.value();
      <lv-page-header
        [heading]="'Commande n° ' + o.number"
        [subtitle]="o.supplierName + ' · ' + statusLabels[o.status]"
      >
        <a class="lv-link-button" routerLink="/app/purchasing">Toutes les commandes</a>
        @if (isKeeper()) {
          @if (o.status === 'DRAFT') {
            <button type="button" class="lv-primary" (click)="send()">Marquer comme envoyée</button>
          }
          @if (['DRAFT', 'SENT', 'PARTIAL'].includes(o.status)) {
            <button type="button" class="lv-secondary" (click)="close()">Clôturer</button>
          }
        }
      </lv-page-header>
      <dl class="lv-dl lv-card mb-6">
        <dt>Créée le</dt>
        <dd>{{ o.createdAt | frDateTime }}</dd>
        <dt>Envoyée le</dt>
        <dd>{{ o.orderedAt ? (o.orderedAt | frDateTime) : '—' }}</dd>
        <dt>Livraison prévue</dt>
        <dd>{{ o.expectedAt ? (o.expectedAt | frDate) : '—' }}</dd>
        @if (o.notes) {
          <dt>Notes</dt>
          <dd>{{ o.notes }}</dd>
        }
      </dl>
      <form (ngSubmit)="receive()">
        <div class="lv-table-wrap">
          <table class="lv-table">
            <caption class="sr-only">
              Lignes de la commande
            </caption>
            <thead>
              <tr>
                <th scope="col">Produit</th>
                <th scope="col" class="num">Commandé</th>
                <th scope="col" class="num">Reçu</th>
                <th scope="col" class="num">Coût unitaire</th>
                <th scope="col" class="num">Montant</th>
                @if (receivable()) {
                  <th scope="col" class="num">À réceptionner</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (l of o.lines; track l.id) {
                <tr>
                  <td>
                    {{ l.itemName }} <span class="text-sm">({{ l.unit }})</span>
                  </td>
                  <td class="num">{{ l.qtyOrdered | qty }}</td>
                  <td class="num">{{ l.qtyReceived | qty }}</td>
                  <td class="num">{{ l.unitCostXaf | xaf }}</td>
                  <td class="num">{{ l.totalXaf | xaf }}</td>
                  @if (receivable()) {
                    <td class="num">
                      @if (l.qtyReceived < l.qtyOrdered) {
                        <label class="sr-only" [for]="'rcv-' + l.id"
                          >Quantité reçue de {{ l.itemName }}</label
                        >
                        <input
                          class="lv-input tabular ml-auto max-w-32 text-right"
                          type="number"
                          min="0"
                          step="0.001"
                          [id]="'rcv-' + l.id"
                          [name]="'rcv' + l.id"
                          [max]="l.qtyOrdered - l.qtyReceived"
                          [ngModel]="qty()[l.id] ?? null"
                          (ngModelChange)="setQty(l.id, $event)"
                        />
                      } @else {
                        Complet
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colspan="4">Total</th>
                <td class="num">{{ o.totalXaf | xaf }}</td>
                @if (receivable()) {
                  <td></td>
                }
              </tr>
            </tfoot>
          </table>
        </div>
        @if (receivable()) {
          <button type="submit" class="lv-primary mt-4" [disabled]="!toReceive().length || busy()">
            Enregistrer la réception
          </button>
        }
      </form>
    } @else if (order.error()) {
      <p class="lv-alert" role="alert">Commande introuvable.</p>
    } @else {
      <p aria-busy="true">Chargement…</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderPage {
  readonly id = input.required<string>();
  private readonly api = inject(ManagementApi);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(Toast);
  protected readonly statusLabels = ORDER_STATUS_LABELS;
  protected readonly isKeeper = computed(() => this.auth.hasTenantRole('STOCK_KEEPER'));
  protected readonly order = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.order(params),
  });
  protected readonly qty = signal<Record<string, number | null>>({});
  protected readonly busy = signal(false);
  protected readonly receivable = computed(
    () =>
      this.isKeeper() &&
      this.order.hasValue() &&
      ['SENT', 'PARTIAL'].includes(this.order.value().status),
  );
  protected readonly toReceive = computed(() =>
    Object.entries(this.qty()).flatMap(([lineId, q]) =>
      q !== null && q > 0 ? [{ lineId, qty: q }] : [],
    ),
  );

  protected setQty(lineId: string, value: number | null): void {
    this.qty.update((q) => ({ ...q, [lineId]: value }));
  }

  private async run(action: () => Promise<unknown>, message: string): Promise<void> {
    this.busy.set(true);
    try {
      await action();
      this.toast.success(message);
      this.qty.set({});
      this.order.reload();
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.busy.set(false);
    }
  }

  protected send = () =>
    this.run(
      () => this.api.updateOrder(this.id(), { status: 'SENT' }),
      'Commande marquée comme envoyée.',
    );

  protected async close(): Promise<void> {
    const ok = await confirmAction(this.dialog, {
      title: 'Clôturer la commande ?',
      message: 'Les quantités non reçues ne seront plus attendues.',
      confirmLabel: 'Clôturer',
    });
    if (ok)
      await this.run(
        () => this.api.updateOrder(this.id(), { status: 'CLOSED' }),
        'Commande clôturée.',
      );
  }

  protected receive = () =>
    this.run(
      () => this.api.receiveOrder(this.id(), this.toReceive()),
      'Réception enregistrée : stock mis à jour.',
    );
}
