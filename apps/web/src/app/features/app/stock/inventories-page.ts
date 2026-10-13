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
import { ManagementApi } from '../../../core/api/management-api';
import { AuthService } from '../../../core/auth/auth.service';
import { FrDateTimePipe } from '../../../shared/format/format';
import { INVENTORY_STATUS_LABELS } from '../../../shared/format/labels';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Toast } from '../../../shared/ui/toast/toast.service';

/** Inventaires (docs/05, « Stock », règle 4) : liste et lancement d'un comptage. */
@Component({
  selector: 'lv-inventories-page',
  imports: [FormsModule, RouterLink, PageHeader, FrDateTimePipe],
  template: `
    <lv-page-header heading="Inventaires" subtitle="Comptage physique et validation des écarts.">
      <a class="lv-link-button" routerLink="/app/stock">Retour au stock</a>
    </lv-page-header>
    @if (isKeeper() && !open()) {
      <form class="lv-card mb-6 flex flex-wrap items-end gap-3" (ngSubmit)="start()">
        <div class="min-w-64 grow">
          <label class="lv-label" for="inv-note">Note (facultatif)</label>
          <input
            id="inv-note"
            class="lv-input"
            maxlength="500"
            name="note"
            [ngModel]="note()"
            (ngModelChange)="note.set($event)"
          />
        </div>
        <button type="submit" class="lv-primary" [disabled]="busy()">Lancer un inventaire</button>
      </form>
    }
    <ul class="grid gap-3" role="list">
      @for (inv of list.hasValue() ? list.value() : []; track inv.id) {
        <li>
          <a
            class="lv-card flex flex-wrap items-center justify-between gap-3 no-underline"
            [routerLink]="['/app/stock/inventories', inv.id]"
          >
            <span>
              <span class="block font-semibold text-teal-900"
                >Inventaire du {{ inv.createdAt | frDateTime }}</span
              >
              <span class="block text-sm text-ink-900"
                >{{ inv.createdByName ?? '—' }} · {{ counted(inv.lines) }} /
                {{ inv.lines.length }} produit(s) compté(s)</span
              >
            </span>
            <span class="lv-chip bg-mint-100 text-teal-900">{{ labels[inv.status] }}</span>
          </a>
        </li>
      } @empty {
        <li class="lv-card">{{ list.isLoading() ? 'Chargement…' : 'Aucun inventaire.' }}</li>
      }
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoriesPage {
  private readonly api = inject(ManagementApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(Toast);
  protected readonly labels = INVENTORY_STATUS_LABELS;
  protected readonly isKeeper = computed(() => this.auth.hasTenantRole('STOCK_KEEPER'));
  protected readonly list = resource({ loader: () => this.api.inventories() });
  protected readonly open = computed(
    () => this.list.hasValue() && this.list.value().some((i) => i.status !== 'VALIDATED'),
  );
  protected readonly note = signal('');
  protected readonly busy = signal(false);
  protected readonly counted = (lines: { countedQty: number | null }[]) =>
    lines.filter((l) => l.countedQty !== null).length;

  protected async start(): Promise<void> {
    this.busy.set(true);
    try {
      const inv = await this.api.createInventory(this.note().trim() || undefined);
      await this.router.navigate(['/app/stock/inventories', inv.id]);
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}
