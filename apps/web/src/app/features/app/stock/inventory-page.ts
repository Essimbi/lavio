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
import { FrDateTimePipe, XafPipe } from '../../../shared/format/format';
import { INVENTORY_STATUS_LABELS, QtyPipe } from '../../../shared/format/labels';
import { confirmAction } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Toast } from '../../../shared/ui/toast/toast.service';

/** Comptage d'un inventaire : quantités comptées, écarts, soumission à la responsable. */
@Component({
  selector: 'lv-inventory-page',
  imports: [FormsModule, RouterLink, PageHeader, XafPipe, QtyPipe, FrDateTimePipe],
  template: `
    @if (inv.hasValue()) {
      @let v = inv.value();
      <lv-page-header
        [heading]="'Inventaire du ' + (v.createdAt | frDateTime)"
        [subtitle]="labels[v.status]"
      >
        <a class="lv-link-button" routerLink="/app/stock/inventories">Tous les inventaires</a>
        @if (editable()) {
          <button type="button" class="lv-secondary" [disabled]="busy()" (click)="save()">
            Enregistrer le comptage
          </button>
          <button type="button" class="lv-primary" [disabled]="busy()" (click)="submit()">
            Soumettre
          </button>
        }
      </lv-page-header>
      @if (v.status === 'PENDING_APPROVAL') {
        <p class="lv-alert mb-4" role="status">
          En attente de validation : le stock sera ajusté à l’approbation.
        </p>
      }
      <div class="lv-table-wrap">
        <table class="lv-table">
          <caption class="sr-only">
            Lignes d’inventaire
          </caption>
          <thead>
            <tr>
              <th scope="col">Produit</th>
              <th scope="col" class="num">Théorique</th>
              <th scope="col" class="num">Compté</th>
              <th scope="col" class="num">Écart</th>
              <th scope="col" class="num">Valeur de l’écart</th>
            </tr>
          </thead>
          <tbody>
            @for (l of v.lines; track l.id) {
              <tr>
                <td>
                  {{ l.itemName }} <span class="text-sm">({{ l.unit }})</span>
                </td>
                <td class="num">{{ l.systemQty | qty }}</td>
                <td class="num">
                  @if (editable()) {
                    <label class="sr-only" [for]="'count-' + l.id"
                      >Quantité comptée de {{ l.itemName }}</label
                    >
                    <input
                      class="lv-input tabular ml-auto max-w-32 text-right"
                      type="number"
                      min="0"
                      step="0.001"
                      [id]="'count-' + l.id"
                      [ngModel]="counts()[l.itemId] ?? l.countedQty"
                      (ngModelChange)="setCount(l.itemId, $event)"
                    />
                  } @else {
                    {{ l.countedQty | qty }}
                  }
                </td>
                <td class="num" [class.text-coral-600]="(variance(l) ?? 0) < 0">
                  {{ variance(l) | qty }}
                </td>
                <td class="num">{{ l.varianceXaf | xaf }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (inv.error()) {
      <p class="lv-alert" role="alert">Inventaire introuvable.</p>
    } @else {
      <p aria-busy="true">Chargement…</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryPage {
  readonly id = input.required<string>();
  private readonly api = inject(ManagementApi);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(Toast);
  protected readonly labels = INVENTORY_STATUS_LABELS;
  protected readonly inv = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.inventory(params),
  });
  protected readonly counts = signal<Partial<Record<string, number | null>>>({});
  protected readonly busy = signal(false);
  protected readonly editable = computed(
    () =>
      this.auth.hasTenantRole('STOCK_KEEPER') &&
      this.inv.hasValue() &&
      this.inv.value().status === 'DRAFT',
  );

  protected setCount(itemId: string, value: number | null | string): void {
    const n = value === '' || value === null ? null : Number(value);
    this.counts.update((c) => ({ ...c, [itemId]: n }));
  }

  protected variance(l: {
    itemId: string;
    systemQty: number;
    countedQty: number | null;
    varianceQty: number | null;
  }): number | null {
    const local = this.counts()[l.itemId];
    if (local === undefined) return l.varianceQty;
    return local === null ? null : Math.round((local - l.systemQty) * 1000) / 1000;
  }

  protected async save(): Promise<boolean> {
    const lines = Object.entries(this.counts()).map(([itemId, countedQty]) => ({
      itemId,
      countedQty: countedQty ?? null,
    }));
    if (!lines.length) return true;
    this.busy.set(true);
    try {
      this.inv.set(await this.api.setInventoryLines(this.id(), lines));
      this.counts.set({});
      this.toast.success('Comptage enregistré.');
      return true;
    } catch (e) {
      this.toast.error(e);
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  protected async submit(): Promise<void> {
    const ok = await confirmAction(this.dialog, {
      title: 'Soumettre l’inventaire ?',
      message:
        'Le comptage ne sera plus modifiable. Les écarts seront appliqués au stock après validation.',
      confirmLabel: 'Soumettre',
    });
    if (!ok || !(await this.save())) return;
    this.busy.set(true);
    try {
      const done = await this.api.submitInventory(this.id());
      this.inv.set(done);
      this.toast.success(
        done.status === 'VALIDATED'
          ? 'Inventaire validé : stock ajusté.'
          : 'Inventaire envoyé pour validation.',
      );
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}
