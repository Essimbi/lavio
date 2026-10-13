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
import { Router, RouterLink } from '@angular/router';
import { PurchaseOrderStatus, type SupplierDto } from '@lavio/shared';
import { ManagementApi } from '../../../core/api/management-api';
import { AuthService } from '../../../core/auth/auth.service';
import { FrDatePipe, PhonePipe, XafPipe } from '../../../shared/format/format';
import { ORDER_STATUS_LABELS } from '../../../shared/format/labels';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Pager } from '../../../shared/ui/pager/pager';
import { Toast } from '../../../shared/ui/toast/toast.service';

type Tab = 'orders' | 'suppliers';

/** Achats (docs/01, module 7) : bons de commande et fournisseurs. */
@Component({
  selector: 'lv-purchasing-page',
  imports: [FormsModule, RouterLink, PageHeader, Pager, FrDatePipe, PhonePipe, XafPipe],
  template: `
    <lv-page-header heading="Achats" subtitle="Commandes fournisseurs et réceptions.">
      @if (isKeeper()) {
        <a class="lv-primary" routerLink="/app/purchasing/new">Nouvelle commande</a>
      }
    </lv-page-header>

    <div class="mb-5 flex gap-2" role="tablist" aria-label="Vues des achats">
      <button
        type="button"
        role="tab"
        class="lv-choice"
        [attr.aria-selected]="view() === 'orders'"
        [class.bg-mint-100]="view() === 'orders'"
        (click)="show('orders')"
      >
        Commandes
      </button>
      <button
        type="button"
        role="tab"
        class="lv-choice"
        [attr.aria-selected]="view() === 'suppliers'"
        [class.bg-mint-100]="view() === 'suppliers'"
        (click)="show('suppliers')"
      >
        Fournisseurs
      </button>
    </div>

    @if (view() === 'orders') {
      <div class="mb-4 max-w-xs">
        <label class="lv-label" for="po-status">Statut</label>
        <select
          id="po-status"
          class="lv-select"
          [ngModel]="status()"
          (ngModelChange)="status.set($event); page.set(1)"
        >
          <option value="">Tous</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ statusLabels[s] }}</option>
          }
        </select>
      </div>
      <div class="lv-table-wrap">
        <table class="lv-table">
          <caption class="sr-only">
            Bons de commande
          </caption>
          <thead>
            <tr>
              <th scope="col">N°</th>
              <th scope="col">Fournisseur</th>
              <th scope="col">Créée le</th>
              <th scope="col">Livraison prévue</th>
              <th scope="col">Statut</th>
              <th scope="col" class="num">Montant</th>
            </tr>
          </thead>
          <tbody>
            @for (o of orders.hasValue() ? orders.value().data : []; track o.id) {
              <tr>
                <td>
                  <a class="tabular font-semibold" [routerLink]="['/app/purchasing', o.id]">{{
                    o.number
                  }}</a>
                </td>
                <td>{{ o.supplierName }}</td>
                <td>{{ o.createdAt | frDate }}</td>
                <td>{{ o.expectedAt ? (o.expectedAt | frDate) : '—' }}</td>
                <td>
                  <span class="lv-chip bg-mint-100 text-teal-900">{{
                    statusLabels[o.status]
                  }}</span>
                </td>
                <td class="num">{{ o.totalXaf | xaf }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6">{{ orders.isLoading() ? 'Chargement…' : 'Aucune commande.' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <lv-pager [meta]="orders.hasValue() ? orders.value().meta : null" (page)="page.set($event)" />
    } @else {
      @if (canEditSuppliers()) {
        <form
          class="lv-card mb-6 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
          (ngSubmit)="addSupplier()"
        >
          <div>
            <label class="lv-label" for="sup-name">Nom du fournisseur</label>
            <input
              id="sup-name"
              class="lv-input"
              name="name"
              maxlength="120"
              [ngModel]="name()"
              (ngModelChange)="name.set($event)"
            />
          </div>
          <div>
            <label class="lv-label" for="sup-phone">Téléphone</label>
            <input
              id="sup-phone"
              class="lv-input"
              name="phone"
              inputmode="tel"
              maxlength="30"
              [ngModel]="phone()"
              (ngModelChange)="phone.set($event)"
            />
          </div>
          <div>
            <label class="lv-label" for="sup-terms">Conditions de paiement</label>
            <input
              id="sup-terms"
              class="lv-input"
              name="terms"
              maxlength="100"
              [ngModel]="terms()"
              (ngModelChange)="terms.set($event)"
            />
          </div>
          <button type="submit" class="lv-primary" [disabled]="name().trim().length < 2">
            Ajouter
          </button>
        </form>
      }
      <ul class="grid gap-3 md:grid-cols-2" role="list">
        @for (s of suppliers.hasValue() ? suppliers.value() : []; track s.id) {
          <li class="lv-card">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-semibold">{{ s.name }}</p>
                <p class="text-sm">{{ s.phone ? (s.phone | phone) : 'Pas de téléphone' }}</p>
                @if (s.paymentTerms) {
                  <p class="text-sm">Paiement : {{ s.paymentTerms }}</p>
                }
              </div>
              @if (canEditSuppliers()) {
                <button type="button" class="lv-link-button" (click)="toggle(s)">
                  {{ s.isActive ? 'Archiver' : 'Réactiver' }}
                </button>
              }
            </div>
          </li>
        } @empty {
          <li class="lv-card">
            {{ suppliers.isLoading() ? 'Chargement…' : 'Aucun fournisseur.' }}
          </li>
        }
      </ul>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchasingPage {
  readonly tab = input<string>();
  private readonly api = inject(ManagementApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(Toast);
  protected readonly view = computed<Tab>(() =>
    this.tab() === 'suppliers' ? 'suppliers' : 'orders',
  );
  protected readonly isKeeper = computed(() => this.auth.hasTenantRole('STOCK_KEEPER'));
  protected readonly canEditSuppliers = computed(() =>
    this.auth.hasTenantRole('STOCK_KEEPER', 'ACCOUNTANT'),
  );
  protected readonly statuses = Object.keys(PurchaseOrderStatus) as PurchaseOrderStatus[];
  protected readonly statusLabels = ORDER_STATUS_LABELS;
  protected readonly status = signal<PurchaseOrderStatus | ''>('');
  protected readonly page = signal(1);
  protected readonly orders = resource({
    params: () =>
      this.view() === 'orders' ? { status: this.status(), page: this.page() } : undefined,
    loader: ({ params }) => this.api.orders(params),
  });
  protected readonly suppliers = resource({
    params: () => (this.view() === 'suppliers' ? true : undefined),
    loader: () => this.api.suppliers(true),
  });
  protected readonly name = signal('');
  protected readonly phone = signal('');
  protected readonly terms = signal('');

  protected show(tab: Tab): Promise<boolean> {
    return this.router.navigate([], { queryParams: { tab: tab === 'orders' ? null : tab } });
  }

  protected async addSupplier(): Promise<void> {
    try {
      await this.api.createSupplier({
        name: this.name().trim(),
        phone: this.phone().trim() || undefined,
        paymentTerms: this.terms().trim() || undefined,
      });
      this.toast.success('Fournisseur ajouté.');
      this.name.set('');
      this.phone.set('');
      this.terms.set('');
      this.suppliers.reload();
    } catch (e) {
      this.toast.error(e);
    }
  }

  protected async toggle(s: SupplierDto): Promise<void> {
    try {
      await this.api.updateSupplier(s.id, { isActive: !s.isActive });
      this.suppliers.reload();
    } catch (e) {
      this.toast.error(e);
    }
  }
}
