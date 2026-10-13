import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterLink } from '@angular/router';
import { ManagementApi } from '../../../core/api/management-api';
import { AuthService } from '../../../core/auth/auth.service';
import { XafPipe } from '../../../shared/format/format';
import { QtyPipe } from '../../../shared/format/labels';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Pager } from '../../../shared/ui/pager/pager';
import { Toast } from '../../../shared/ui/toast/toast.service';
import { openStockItemDialog } from './stock-item-dialog';

/** Stock (docs/01, module 7) : produits, quantités, seuils, valorisation au coût moyen. */
@Component({
  selector: 'lv-stock-page',
  imports: [FormsModule, RouterLink, PageHeader, Pager, XafPipe, QtyPipe],
  template: `
    <lv-page-header heading="Stock" subtitle="Produits, quantités et alertes de seuil.">
      @if (isKeeper()) {
        <a class="lv-secondary" routerLink="/app/stock/inventories">Inventaires</a>
        <button type="button" class="lv-primary" (click)="create()">Nouveau produit</button>
      }
    </lv-page-header>

    @if (alerts.hasValue() && alerts.value().length) {
      <p class="lv-card mb-4 border-l-4 border-coral-600" role="status">
        <strong>{{ alerts.value().length }} produit(s) sous le seuil :</strong>
        @for (a of alerts.value(); track a.id; let last = $last) {
          <a [routerLink]="['/app/stock', a.id]">{{ a.name }}</a
          >{{ last ? '' : ', ' }}
        }
      </p>
    }

    <div class="mb-4 flex flex-wrap items-end gap-3">
      <div class="min-w-64 grow">
        <label class="lv-label" for="stock-search">Rechercher un produit</label>
        <input
          id="stock-search"
          class="lv-input"
          type="search"
          [ngModel]="q()"
          (ngModelChange)="q.set($event); page.set(1)"
        />
      </div>
      <label class="flex min-h-11 items-center gap-2">
        <input type="checkbox" [ngModel]="low()" (ngModelChange)="low.set($event); page.set(1)" />
        Sous le seuil seulement
      </label>
    </div>

    <div class="lv-table-wrap">
      <table class="lv-table">
        <caption class="sr-only">
          Produits de stock
        </caption>
        <thead>
          <tr>
            <th scope="col">Produit</th>
            <th scope="col">Catégorie</th>
            <th scope="col" class="num">Quantité</th>
            <th scope="col" class="num">Seuil</th>
            <th scope="col" class="num">Coût moyen</th>
            <th scope="col" class="num">Valeur</th>
          </tr>
        </thead>
        <tbody>
          @for (i of list.hasValue() ? list.value().data : []; track i.id) {
            <tr>
              <td>
                <a class="font-semibold" [routerLink]="['/app/stock', i.id]">{{ i.name }}</a>
                @if (i.low) {
                  <span class="lv-chip ml-2 bg-coral-600 font-bold text-white">Stock bas</span>
                }
              </td>
              <td>{{ i.category ?? '—' }}</td>
              <td class="num" [class.text-coral-600]="i.onHand < 0">
                {{ i.onHand | qty }} {{ i.unit }}
              </td>
              <td class="num">{{ i.alertThreshold | qty }}</td>
              <td class="num">{{ i.avgCostXaf | xaf }}</td>
              <td class="num">{{ i.valueXaf | xaf }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="6">{{ list.isLoading() ? 'Chargement…' : 'Aucun produit.' }}</td>
            </tr>
          }
        </tbody>
        @if (list.hasValue() && list.value().data.length) {
          <tfoot>
            <tr>
              <th scope="row" colspan="5">Valeur de la page</th>
              <td class="num">{{ pageValue() | xaf }}</td>
            </tr>
          </tfoot>
        }
      </table>
    </div>
    <lv-pager [meta]="list.hasValue() ? list.value().meta : null" (page)="page.set($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockPage {
  private readonly api = inject(ManagementApi);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly toast = inject(Toast);
  protected readonly isKeeper = computed(() => this.auth.hasTenantRole('STOCK_KEEPER'));
  protected readonly q = signal('');
  protected readonly low = signal(false);
  protected readonly page = signal(1);
  protected readonly list = resource({
    params: () => ({ q: this.q().trim(), low: this.low() || undefined, page: this.page() }),
    loader: ({ params }) => this.api.stockItems(params),
  });
  protected readonly alerts = resource({ loader: () => this.api.stockAlerts() });
  protected readonly pageValue = computed(() =>
    this.list.hasValue() ? this.list.value().data.reduce((s, i) => s + i.valueXaf, 0) : 0,
  );

  protected async create(): Promise<void> {
    const suppliers = await this.api.suppliers().catch(() => []);
    const created = await openStockItemDialog(this.dialog, { item: null, suppliers });
    if (!created) return;
    this.toast.success('Produit créé.');
    await this.router.navigate(['/app/stock', created.id]);
  }
}
