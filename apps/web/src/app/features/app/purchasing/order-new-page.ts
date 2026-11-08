import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { OrderLineInput } from '../../../core/api/management-api';
import { ManagementApi } from '../../../core/api/management-api';
import { XafPipe } from '../../../shared/format/format';
import { LV_FIELD } from '../../../shared/ui/field/field';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Toast } from '../../../shared/ui/toast/toast.service';

interface Line {
  itemId: string;
  qty: number | null;
  cost: number | null;
}

/** Nouveau bon de commande (brouillon) : fournisseur, lignes produit, quantité, coût. */
@Component({
  selector: 'lv-order-new-page',
  imports: [FormsModule, LV_FIELD, RouterLink, PageHeader, XafPipe],
  template: `
    <lv-page-header heading="Nouvelle commande" subtitle="La commande est créée en brouillon.">
      <a class="lv-link-button" routerLink="/app/purchasing">Annuler</a>
    </lv-page-header>
    <form class="grid max-w-4xl gap-6" (ngSubmit)="save()">
      <div class="lv-card grid gap-4 sm:grid-cols-2">
        <lv-field label="Fournisseur" [errors]="{ required: 'Choisissez le fournisseur.' }">
          <select
            lvControl
            name="supplier"
            required
            [ngModel]="supplierId()"
            (ngModelChange)="supplierId.set($event)"
          >
            <option value="">— Choisir —</option>
            @for (s of suppliers.hasValue() ? suppliers.value() : []; track s.id) {
              <option [value]="s.id">{{ s.name }}</option>
            }
          </select>
        </lv-field>
        <lv-field label="Livraison prévue">
          <input
            lvControl
            type="date"
            name="expected"
            [ngModel]="expectedAt()"
            (ngModelChange)="expectedAt.set($event)"
          />
        </lv-field>
        <lv-field label="Notes" class="sm:col-span-2">
          <input
            lvControl
            name="notes"
            maxlength="1000"
            [ngModel]="notes()"
            (ngModelChange)="notes.set($event)"
          />
        </lv-field>
      </div>

      <section class="lv-card" aria-labelledby="lines-title">
        <h2 id="lines-title" class="mb-3 text-xl">Lignes</h2>
        <ol class="grid gap-3" role="list">
          @for (l of lines(); track $index; let i = $index) {
            <li class="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
              <lv-field [label]="'Produit ' + (i + 1)">
                <select
                  lvControl
                  [name]="'item' + i"
                  [ngModel]="l.itemId"
                  (ngModelChange)="update(i, { itemId: $event, cost: costOf($event) })"
                >
                  <option value="">— Choisir —</option>
                  @for (it of items.hasValue() ? items.value().data : []; track it.id) {
                    <option [value]="it.id">{{ it.name }} ({{ it.unit }})</option>
                  }
                </select>
              </lv-field>
              <lv-field label="Quantité" [errors]="{ min: 'La quantité doit être positive.' }">
                <input
                  lvControl
                  class="tabular"
                  type="number"
                  min="0.001"
                  step="0.001"
                  [name]="'qty' + i"
                  [ngModel]="l.qty"
                  (ngModelChange)="update(i, { qty: $event })"
                />
              </lv-field>
              <lv-field
                label="Coût unitaire (FCFA)"
                [errors]="{ min: 'Le coût ne peut pas être négatif.' }"
              >
                <input
                  lvControl
                  class="tabular"
                  type="number"
                  min="0"
                  [name]="'cost' + i"
                  [ngModel]="l.cost"
                  (ngModelChange)="update(i, { cost: $event })"
                />
              </lv-field>
              <button
                type="button"
                class="lv-link-button text-coral-600"
                [disabled]="lines().length === 1"
                (click)="remove(i)"
              >
                Retirer
              </button>
            </li>
          }
        </ol>
        <button type="button" class="lv-link-button mt-3" (click)="add()">
          + Ajouter une ligne
        </button>
        <p class="tabular mt-4 text-lg">
          Total : <strong>{{ total() | xaf }}</strong>
        </p>
      </section>

      <button type="submit" class="lv-primary justify-self-start" [disabled]="!valid() || busy()">
        Créer la commande
      </button>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderNewPage {
  private readonly api = inject(ManagementApi);
  private readonly router = inject(Router);
  private readonly toast = inject(Toast);
  protected readonly suppliers = resource({ loader: () => this.api.suppliers() });
  protected readonly items = resource({ loader: () => this.api.stockItems({ pageSize: 100 }) });
  protected readonly supplierId = signal('');
  protected readonly expectedAt = signal('');
  protected readonly notes = signal('');
  protected readonly lines = signal<Line[]>([{ itemId: '', qty: null, cost: null }]);
  protected readonly busy = signal(false);

  private readonly complete = computed(() =>
    this.lines().filter((l) => l.itemId && (l.qty ?? 0) > 0 && l.cost !== null && l.cost >= 0),
  );
  protected readonly total = computed(() =>
    this.complete().reduce((s, l) => s + Math.round(Number(l.qty) * Number(l.cost)), 0),
  );
  protected readonly valid = computed(
    () =>
      !!this.supplierId() &&
      this.complete().length === this.lines().length &&
      new Set(this.lines().map((l) => l.itemId)).size === this.lines().length,
  );

  protected costOf(itemId: string): number | null {
    return this.items.hasValue()
      ? (this.items.value().data.find((i) => i.id === itemId)?.purchasePriceXaf ?? null)
      : null;
  }

  protected update(index: number, patch: Partial<Line>): void {
    this.lines.update((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  protected add(): void {
    this.lines.update((ls) => [...ls, { itemId: '', qty: null, cost: null }]);
  }

  protected remove(index: number): void {
    this.lines.update((ls) => ls.filter((_, i) => i !== index));
  }

  protected async save(): Promise<void> {
    if (!this.valid()) return;
    this.busy.set(true);
    try {
      const lines: OrderLineInput[] = this.lines().map((l) => ({
        itemId: l.itemId,
        qtyOrdered: Number(l.qty),
        unitCostXaf: Math.floor(Number(l.cost)),
      }));
      const order = await this.api.createOrder({
        supplierId: this.supplierId(),
        expectedAt: this.expectedAt() || undefined,
        notes: this.notes().trim() || undefined,
        lines,
      });
      this.toast.success(`Commande n° ${order.number} créée.`);
      await this.router.navigate(['/app/purchasing', order.id]);
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}
