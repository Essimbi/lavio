import { ChangeDetectionStrategy, Component, inject, resource } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { APPROVAL_TYPE_LABELS, type ApprovalDto } from '@lavio/shared';
import { PressingApi } from '../../core/api/pressing-api';
import { NotificationCenter } from '../../core/notifications/notification-center';
import { FrDateTimePipe, XafPipe } from '../../shared/format/format';
import { confirmAction } from '../../shared/ui/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Toast } from '../../shared/ui/toast/toast.service';

/**
 * Validations à distance (module 10) : remises, ventes à crédit, clôtures de caisse,
 * ajustements de stock, inventaires, dépenses importantes.
 */
@Component({
  selector: 'lv-approvals-page',
  imports: [RouterLink, PageHeader, FrDateTimePipe, XafPipe],
  template: `
    <lv-page-header heading="Validations" subtitle="Demandes qui attendent votre accord." />
    <ul class="grid gap-4 lg:grid-cols-2" role="list">
      @for (a of pending.hasValue() ? pending.value() : []; track a.id) {
        <li class="lv-card border-l-4 border-amber-500">
          <p class="text-sm font-semibold text-teal-700">{{ typeLabel(a) }}</p>
          @if (a.type === 'DISCOUNT') {
            <p class="mt-1 text-lg font-semibold">
              <a [routerLink]="['/app/deposits', a.payload['depositId']]"
                >Dépôt n° {{ a.payload['ticketNumber'] }}</a
              >
              · {{ a.payload['customerName'] }}
            </p>
            <p class="tabular">
              Remise de <strong>{{ $any(a.payload['discountXaf']) | xaf }}</strong> sur
              {{ $any(a.payload['subtotalXaf']) | xaf }} ({{ a.payload['discountPercent'] }} %)
            </p>
          } @else if (a.type === 'CREDIT') {
            <p class="mt-1 text-lg font-semibold">
              <a [routerLink]="['/app/deposits', a.payload['depositId']]"
                >Dépôt n° {{ a.payload['ticketNumber'] }}</a
              >
              · {{ a.payload['customerName'] }}
            </p>
            <p class="tabular">
              Restitution sans paiement complet : reste
              <strong>{{ $any(a.payload['balanceXaf']) | xaf }}</strong> en créance.
            </p>
          } @else if (a.type === 'CASH_CLOSE') {
            <dl class="lv-dl tabular mt-2">
              <dt>Attendu</dt>
              <dd>{{ $any(a.payload['expectedCashXaf']) | xaf }}</dd>
              <dt>Compté</dt>
              <dd>{{ $any(a.payload['countedCashXaf']) | xaf }}</dd>
              <dt>Écart</dt>
              <dd class="font-semibold" [class.text-coral-600]="a.payload['varianceXaf'] !== 0">
                {{ $any(a.payload['varianceXaf']) | xaf }}
              </dd>
            </dl>
            @if (a.payload['note']) {
              <p class="mt-2 text-sm">Note : {{ a.payload['note'] }}</p>
            }
            <a class="mt-1 inline-block text-sm" routerLink="/app/cash"
              >Voir le journal de caisse</a
            >
          } @else if (a.type === 'STOCK_ADJUSTMENT') {
            <p class="mt-1 text-lg font-semibold">
              <a [routerLink]="['/app/stock', a.payload['itemId']]">{{ a.payload['itemName'] }}</a>
            </p>
            <dl class="lv-dl tabular mt-2">
              <dt>Ajustement</dt>
              <dd class="font-semibold">{{ signedQty(a) }} {{ a.payload['unit'] }}</dd>
              <dt>Motif</dt>
              <dd>{{ a.payload['reasonLabel'] ?? '—' }}</dd>
            </dl>
            @if (a.payload['note']) {
              <p class="mt-2 text-sm">Note : {{ a.payload['note'] }}</p>
            }
          } @else if (a.type === 'INVENTORY') {
            <dl class="lv-dl tabular mt-2">
              <dt>Lignes comptées</dt>
              <dd>{{ a.payload['countedLines'] }}</dd>
              <dt>Écarts</dt>
              <dd>{{ a.payload['changedLines'] }}</dd>
              <dt>Valeur des écarts</dt>
              <dd class="font-semibold" [class.text-coral-600]="a.payload['varianceXaf'] !== 0">
                {{ $any(a.payload['varianceXaf']) | xaf }}
              </dd>
            </dl>
            <a
              class="mt-1 inline-block text-sm"
              [routerLink]="['/app/stock/inventories', a.payload['inventoryId']]"
              >Voir l’inventaire</a
            >
          } @else if (a.type === 'EXPENSE') {
            <p class="mt-1 text-lg font-semibold tabular">
              {{ $any(a.payload['amountXaf']) | xaf }} · {{ a.payload['categoryName'] }}
            </p>
            <dl class="lv-dl mt-2">
              <dt>Compte</dt>
              <dd>{{ a.payload['accountName'] ?? '—' }}</dd>
              <dt>Libellé</dt>
              <dd>{{ a.payload['description'] ?? '—' }}</dd>
            </dl>
            <a class="mt-1 inline-block text-sm" routerLink="/app/expenses">Voir les dépenses</a>
          }
          <p class="mt-1 text-sm">
            Demandée par {{ a.requestedByName ?? '—' }} le {{ a.createdAt | frDateTime }}
          </p>
          <div class="mt-4 flex gap-2">
            <button type="button" class="lv-primary" (click)="approve(a)">Valider</button>
            <button type="button" class="lv-secondary" (click)="reject(a)">Refuser</button>
          </div>
        </li>
      } @empty {
        <li class="lv-card">
          {{ pending.isLoading() ? 'Chargement…' : 'Aucune demande en attente.' }}
        </li>
      }
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalsPage {
  private readonly api = inject(PressingApi);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(Toast);
  private readonly center = inject(NotificationCenter);
  protected readonly pending = resource({ loader: () => this.api.approvals('PENDING') });
  protected readonly typeLabel = (a: ApprovalDto) => APPROVAL_TYPE_LABELS[a.type];
  /** Quantité d'un ajustement de stock, avec son signe (+ entrée, − sortie). */
  protected signedQty(a: ApprovalDto): string {
    const q = Number(a.payload['quantity'] ?? 0);
    return `${q > 0 ? '+' : q < 0 ? '−' : ''}${new Intl.NumberFormat('fr-FR').format(Math.abs(q))}`;
  }

  protected async approve(a: ApprovalDto): Promise<void> {
    try {
      await this.api.approve(a.id);
      this.toast.success('Demande validée.');
      this.pending.reload();
      void this.center.refresh();
    } catch (e) {
      this.toast.error(e);
    }
  }

  protected async reject(a: ApprovalDto): Promise<void> {
    const ok = await confirmAction(this.dialog, {
      title: 'Refuser cette demande ?',
      message: 'La personne qui l’a faite sera informée dans l’application.',
      confirmLabel: 'Refuser',
      danger: true,
      askReason: true,
    });
    if (!ok) return;
    try {
      await this.api.reject(a.id, ok.reason);
      this.toast.success('Demande refusée.');
      this.pending.reload();
      void this.center.refresh();
    } catch (e) {
      this.toast.error(e);
    }
  }
}
