import { ChangeDetectionStrategy, Component, inject, resource } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import type { ApprovalDto } from '@lavio/shared';
import { PressingApi } from '../../core/api/pressing-api';
import { FrDateTimePipe, XafPipe } from '../../shared/format/format';
import { confirmAction } from '../../shared/ui/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Toast } from '../../shared/ui/toast/toast.service';

const TYPE_LABELS: Record<string, string> = {
  DISCOUNT: 'Remise exceptionnelle',
  CREDIT: 'Vente à crédit',
  STOCK_ADJUSTMENT: 'Ajustement de stock',
  INVENTORY: 'Inventaire',
  CASH_CLOSE: 'Clôture de caisse',
  EXPENSE: 'Dépense importante',
};

/** Validations à distance (module 10), pensées pour le téléphone de la responsable. */
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
  protected readonly pending = resource({ loader: () => this.api.approvals('PENDING') });
  protected readonly typeLabel = (a: ApprovalDto) => TYPE_LABELS[a.type] ?? a.type;

  protected async approve(a: ApprovalDto): Promise<void> {
    try {
      await this.api.approve(a.id);
      this.toast.success('Demande validée.');
      this.pending.reload();
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
    } catch (e) {
      this.toast.error(e);
    }
  }
}
