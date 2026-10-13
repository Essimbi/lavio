import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { STOCK_REASON_LABELS, StockReasonCode } from '@lavio/shared';
import { ManagementApi } from '../../../core/api/management-api';
import { AuthService } from '../../../core/auth/auth.service';
import { FrDateTimePipe, XafPipe } from '../../../shared/format/format';
import { MOVEMENT_TYPE_LABELS, QtyPipe } from '../../../shared/format/labels';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Pager } from '../../../shared/ui/pager/pager';
import { Toast } from '../../../shared/ui/toast/toast.service';
import { openStockItemDialog } from './stock-item-dialog';

type MoveType = 'IN' | 'OUT' | 'ADJUSTMENT';

/** Fiche produit : quantité, coût moyen, saisie des mouvements et historique. */
@Component({
  selector: 'lv-stock-item-page',
  imports: [FormsModule, RouterLink, PageHeader, Pager, XafPipe, QtyPipe, FrDateTimePipe],
  template: `
    @if (item.hasValue()) {
      @let i = item.value();
      <lv-page-header [heading]="i.name" [subtitle]="i.category ?? 'Produit de stock'">
        <a class="lv-link-button" routerLink="/app/stock">Tout le stock</a>
        @if (isKeeper()) {
          <button type="button" class="lv-secondary" (click)="edit()">Modifier</button>
        }
      </lv-page-header>

      <div class="mb-6 grid gap-3 sm:grid-cols-4">
        <div class="lv-card" [class.border-l-4]="i.low" [class.border-coral-600]="i.low">
          <p class="text-sm">En stock</p>
          <p class="tabular text-2xl font-semibold">{{ i.onHand | qty }} {{ i.unit }}</p>
          @if (i.low) {
            <p class="text-sm font-semibold text-coral-600">
              Sous le seuil ({{ i.alertThreshold | qty }})
            </p>
          }
        </div>
        <div class="lv-card">
          <p class="text-sm">Coût moyen pondéré</p>
          <p class="tabular text-2xl font-semibold">{{ i.avgCostXaf | xaf }}</p>
        </div>
        <div class="lv-card">
          <p class="text-sm">Valeur</p>
          <p class="tabular text-2xl font-semibold">{{ i.valueXaf | xaf }}</p>
        </div>
        <div class="lv-card">
          <p class="text-sm">Fournisseur</p>
          <p class="font-semibold">{{ i.supplierName ?? '—' }}</p>
          <p class="text-sm">Dernier prix : {{ i.purchasePriceXaf | xaf }}</p>
        </div>
      </div>

      <div class="grid gap-6 xl:grid-cols-[2fr_3fr]">
        @if (types().length) {
          <form
            class="lv-card grid content-start gap-4"
            (ngSubmit)="submit()"
            aria-labelledby="move-title"
          >
            <h2 id="move-title" class="text-xl">Nouveau mouvement</h2>
            <fieldset>
              <legend class="lv-label">Type</legend>
              <div class="flex flex-wrap gap-2">
                @for (t of types(); track t) {
                  <label class="lv-choice">
                    <input
                      type="radio"
                      name="type"
                      [value]="t"
                      [ngModel]="type()"
                      (ngModelChange)="type.set($event)"
                    />
                    {{ typeLabels[t] }}
                  </label>
                }
              </div>
            </fieldset>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="lv-label" for="move-qty">
                  {{ type() === 'ADJUSTMENT' ? 'Correction (+ ou −)' : 'Quantité' }} ({{ i.unit }})
                </label>
                <input
                  id="move-qty"
                  class="lv-input tabular"
                  type="number"
                  step="0.001"
                  name="quantity"
                  required
                  [ngModel]="quantity()"
                  (ngModelChange)="quantity.set($event)"
                />
              </div>
              @if (type() === 'IN') {
                <div>
                  <label class="lv-label" for="move-cost">Coût unitaire (FCFA)</label>
                  <input
                    id="move-cost"
                    class="lv-input tabular"
                    type="number"
                    min="0"
                    name="unitCost"
                    [ngModel]="unitCost()"
                    (ngModelChange)="unitCost.set($event)"
                  />
                </div>
              } @else {
                <div>
                  <label class="lv-label" for="move-reason">Motif</label>
                  <select
                    id="move-reason"
                    class="lv-select"
                    name="reason"
                    [ngModel]="reason()"
                    (ngModelChange)="reason.set($event)"
                  >
                    <option value="">— Choisir —</option>
                    @for (r of reasons(); track r) {
                      <option [value]="r">{{ reasonLabels[r] }}</option>
                    }
                  </select>
                </div>
              }
            </div>
            <div>
              <label class="lv-label" for="move-note"
                >Note{{ allowNegative() ? ' (obligatoire)' : '' }}</label
              >
              <input
                id="move-note"
                class="lv-input"
                maxlength="500"
                name="note"
                [ngModel]="note()"
                (ngModelChange)="note.set($event)"
              />
            </div>
            @if (isOwner() && type() === 'OUT') {
              <label class="flex items-start gap-2">
                <input
                  type="checkbox"
                  name="allowNegative"
                  [ngModel]="allowNegative()"
                  (ngModelChange)="allowNegative.set($event)"
                />
                Autoriser un stock négatif (dérogation tracée)
              </label>
            }
            @if (type() === 'ADJUSTMENT' && !isOwner()) {
              <p class="text-sm">
                L’ajustement sera appliqué après la validation de la responsable.
              </p>
            }
            <button type="submit" class="lv-primary" [disabled]="!valid() || busy()">
              Enregistrer
            </button>
          </form>
        }

        <section aria-labelledby="history-title">
          <h2 id="history-title" class="mb-3 text-xl">Mouvements</h2>
          <div class="lv-table-wrap">
            <table class="lv-table">
              <caption class="sr-only">
                Mouvements du produit
              </caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Type</th>
                  <th scope="col" class="num">Quantité</th>
                  <th scope="col" class="num">Coût unitaire</th>
                  <th scope="col">Motif</th>
                  <th scope="col">Par</th>
                </tr>
              </thead>
              <tbody>
                @for (m of movements.hasValue() ? movements.value().data : []; track m.id) {
                  <tr>
                    <td>{{ m.occurredAt | frDateTime }}</td>
                    <td>{{ typeLabels[m.type] }}</td>
                    <td class="num" [class.text-coral-600]="m.quantity < 0">
                      {{ m.quantity > 0 ? '+' : '' }}{{ m.quantity | qty }}
                    </td>
                    <td class="num">{{ m.unitCostXaf | xaf }}</td>
                    <td>
                      {{ m.reasonCode ? reasonLabel(m.reasonCode) : '' }}
                      @if (m.note) {
                        <span class="block text-sm">{{ m.note }}</span>
                      }
                    </td>
                    <td>{{ m.createdByName ?? '—' }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6">
                      {{ movements.isLoading() ? 'Chargement…' : 'Aucun mouvement.' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <lv-pager
            [meta]="movements.hasValue() ? movements.value().meta : null"
            (page)="page.set($event)"
          />
        </section>
      </div>
    } @else if (item.error()) {
      <p class="lv-alert" role="alert">Produit introuvable.</p>
    } @else {
      <p aria-busy="true">Chargement…</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockItemPage {
  readonly id = input.required<string>();
  private readonly api = inject(ManagementApi);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(Toast);

  protected readonly typeLabels = MOVEMENT_TYPE_LABELS;
  protected readonly reasonLabels = STOCK_REASON_LABELS;
  protected readonly isOwner = computed(() => this.auth.hasTenantRole());
  protected readonly isKeeper = computed(() => this.auth.hasTenantRole('STOCK_KEEPER'));
  private readonly isOperator = computed(() => this.auth.hasTenantRole('OPERATOR'));

  protected readonly item = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.stockItem(params),
  });
  protected readonly page = signal(1);
  protected readonly movements = resource({
    params: () => ({ id: this.id(), page: this.page() }),
    loader: ({ params }) => this.api.itemMovements(params.id, params.page),
  });

  /** Types permis (docs/05) : magasinier tout ; opérateur, sorties de consommation. */
  protected readonly types = computed<MoveType[]>(() =>
    this.isKeeper() ? ['IN', 'OUT', 'ADJUSTMENT'] : this.isOperator() ? ['OUT'] : [],
  );
  protected readonly type = linkedSignal<MoveType>(() => this.types()[0] ?? 'OUT');
  protected readonly reasons = computed<StockReasonCode[]>(() =>
    this.isKeeper() ? (Object.keys(StockReasonCode) as StockReasonCode[]) : ['CONSUMPTION'],
  );
  protected readonly quantity = signal<number | null>(null);
  protected readonly unitCost = linkedSignal<number | null>(() =>
    this.item.hasValue() ? this.item.value().purchasePriceXaf : null,
  );
  protected readonly reason = signal<StockReasonCode | ''>('');
  protected readonly note = signal('');
  protected readonly allowNegative = signal(false);
  protected readonly busy = signal(false);

  protected readonly valid = computed(() => {
    const q = this.quantity();
    if (q === null || !Number.isFinite(q) || q === 0) return false;
    if (this.type() !== 'ADJUSTMENT' && q < 0) return false;
    if (this.type() !== 'IN' && !this.reason()) return false;
    if (this.allowNegative() && this.note().trim().length < 3) return false;
    return true;
  });

  protected reasonLabel(code: string): string {
    return (STOCK_REASON_LABELS as Record<string, string>)[code] ?? code;
  }

  protected async submit(): Promise<void> {
    if (!this.valid()) return;
    this.busy.set(true);
    try {
      const type = this.type();
      const result = await this.api.move({
        itemId: this.id(),
        type,
        quantity: Number(this.quantity()),
        unitCostXaf:
          type === 'IN' && this.unitCost() !== null
            ? Math.floor(Number(this.unitCost()))
            : undefined,
        reasonCode: type === 'IN' ? undefined : this.reason() || undefined,
        note: this.note().trim() || undefined,
        allowNegative: type === 'OUT' && this.allowNegative() ? true : undefined,
      });
      this.toast.success(
        result.outcome === 'approval'
          ? 'Ajustement envoyé à la responsable pour validation.'
          : 'Mouvement enregistré.',
      );
      this.quantity.set(null);
      this.note.set('');
      this.reason.set('');
      this.allowNegative.set(false);
      this.item.reload();
      this.movements.reload();
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.busy.set(false);
    }
  }

  protected async edit(): Promise<void> {
    if (!this.item.hasValue()) return;
    try {
      const suppliers = await this.api.suppliers();
      const saved = await openStockItemDialog(this.dialog, { item: this.item.value(), suppliers });
      if (saved) {
        this.toast.success('Produit modifié.');
        this.item.reload();
      }
    } catch (e) {
      this.toast.error(e);
    }
  }
}
