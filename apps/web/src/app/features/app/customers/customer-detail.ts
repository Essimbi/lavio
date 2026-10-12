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
import { RouterLink } from '@angular/router';
import type { CustomerDto, SpecialPriceDto } from '@lavio/shared';
import { PressingApi } from '../../../core/api/pressing-api';
import { AuthService } from '../../../core/auth/auth.service';
import { FrDatePipe, PhonePipe, XafPipe } from '../../../shared/format/format';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Pager } from '../../../shared/ui/pager/pager';
import { DepositChip } from '../../../shared/ui/status-chip/deposit-chip';
import { errorMessage, Toast } from '../../../shared/ui/toast/toast.service';
import { CustomerForm } from './customer-form';

/** Fiche client : informations, historique des dépôts, prix spéciaux (clients à compte). */
@Component({
  selector: 'lv-customer-detail',
  imports: [
    FormsModule,
    RouterLink,
    PageHeader,
    Pager,
    DepositChip,
    CustomerForm,
    FrDatePipe,
    PhonePipe,
    XafPipe,
  ],
  template: `
    @if (customer.hasValue()) {
      @let c = customer.value();
      <lv-page-header
        [heading]="c.name"
        [subtitle]="(c.phone | phone) + (c.type === 'COMPANY' ? ' · Entreprise' : '')"
      >
        <a class="lv-link-button" routerLink="/app/customers">Tous les clients</a>
        @if (auth.hasTenantRole('CASHIER')) {
          <button type="button" class="lv-secondary" (click)="editing.set(!editing())">
            {{ editing() ? 'Fermer' : 'Modifier' }}
          </button>
        }
      </lv-page-header>
      @if (editing()) {
        <lv-customer-form
          class="mb-6 block"
          [customer]="c"
          (saved)="saved($event)"
          (cancelled)="editing.set(false)"
        />
      }

      <section class="mb-6">
        <h2 class="mb-3 text-xl">Historique des dépôts</h2>
        <div class="lv-table-wrap">
          <table class="lv-table">
            <caption class="sr-only">
              Dépôts du client
            </caption>
            <thead>
              <tr>
                <th scope="col">N°</th>
                <th scope="col">Déposé le</th>
                <th scope="col">Statut</th>
                <th scope="col" class="num">Total</th>
                <th scope="col" class="num">Reste</th>
              </tr>
            </thead>
            <tbody>
              @for (d of history.hasValue() ? history.value().data : []; track d.id) {
                <tr>
                  <td>
                    <a class="tabular font-semibold" [routerLink]="['/app/deposits', d.id]">{{
                      d.ticketNumber
                    }}</a>
                  </td>
                  <td>{{ d.receivedAt | frDate }}</td>
                  <td><lv-deposit-chip [status]="d.status" [late]="d.late" /></td>
                  <td class="num">{{ d.totalXaf | xaf }}</td>
                  <td class="num">{{ d.balanceXaf | xaf }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5">Aucun dépôt pour l’instant.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <lv-pager
          [meta]="history.hasValue() ? history.value().meta : null"
          (page)="page.set($event)"
        />
      </section>

      @if (auth.hasTenantRole() && grid.hasValue()) {
        <section class="lv-card">
          <h2 class="mb-1 text-xl">Prix spéciaux</h2>
          <p class="mb-3 text-sm">
            Pour les clients à compte : ces prix remplacent ceux du catalogue.
          </p>
          <ul class="grid gap-2" role="list">
            @for (p of specials(); track $index) {
              <li class="grid items-end gap-2 sm:grid-cols-[1fr_1fr_160px_auto]">
                <select
                  class="lv-select"
                  [attr.aria-label]="'Article ' + ($index + 1)"
                  [ngModel]="p.itemTypeId"
                  (ngModelChange)="edit($index, { itemTypeId: $event })"
                >
                  @for (t of grid.value().itemTypes; track t.id) {
                    <option [value]="t.id">{{ t.name }}</option>
                  }
                </select>
                <select
                  class="lv-select"
                  [attr.aria-label]="'Service ' + ($index + 1)"
                  [ngModel]="p.serviceId"
                  (ngModelChange)="edit($index, { serviceId: $event })"
                >
                  @for (s of grid.value().services; track s.id) {
                    <option [value]="s.id">{{ s.name }}</option>
                  }
                </select>
                <input
                  class="lv-input tabular"
                  type="number"
                  min="0"
                  [attr.aria-label]="'Prix ' + ($index + 1) + ' en FCFA'"
                  [ngModel]="p.amountXaf"
                  (ngModelChange)="edit($index, { amountXaf: $event })"
                />
                <button type="button" class="lv-link-button" (click)="remove($index)">
                  Retirer
                </button>
              </li>
            }
          </ul>
          <div class="mt-3 flex flex-wrap gap-2">
            <button type="button" class="lv-secondary" (click)="add()" [disabled]="!canAdd()">
              + Ajouter un prix
            </button>
            <button type="button" class="lv-primary" (click)="saveSpecials()">
              Enregistrer les prix spéciaux
            </button>
          </div>
          @if (error()) {
            <p class="lv-alert mt-3" role="alert">{{ error() }}</p>
          }
        </section>
      }
    } @else if (customer.error()) {
      <p class="lv-alert" role="alert">Client introuvable.</p>
    } @else {
      <p aria-busy="true">Chargement…</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDetail {
  readonly id = input.required<string>();
  private readonly api = inject(PressingApi);
  private readonly toast = inject(Toast);
  protected readonly auth = inject(AuthService);
  protected readonly customer = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.customer(params),
  });
  protected readonly page = signal(1);
  protected readonly history = resource({
    params: () => ({ id: this.id(), page: this.page() }),
    loader: ({ params }) => this.api.customerHistory(params.id, params.page),
  });
  protected readonly grid = resource({
    params: () => (this.auth.hasTenantRole() ? 'ok' : undefined),
    loader: () => this.api.grid(),
  });
  protected readonly specials = signal<SpecialPriceDto[]>([]);
  protected readonly editing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly canAdd = computed(
    () =>
      this.grid.hasValue() &&
      this.grid.value().itemTypes.length > 0 &&
      this.grid.value().services.length > 0,
  );
  private readonly loadSpecials = resource({
    params: () => (this.auth.hasTenantRole() ? this.id() : undefined),
    loader: async ({ params }) => {
      const list = await this.api.specialPrices(params);
      this.specials.set(list);
      return list;
    },
  });

  protected saved(c: CustomerDto): void {
    this.editing.set(false);
    this.toast.success('Fiche client enregistrée.');
    this.customer.set(c);
  }

  protected edit(index: number, patch: Partial<SpecialPriceDto>): void {
    this.specials.update((list) => list.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  protected add(): void {
    if (!this.grid.hasValue()) return;
    const g = this.grid.value();
    this.specials.update((list) => [
      ...list,
      { itemTypeId: g.itemTypes[0]?.id ?? '', serviceId: g.services[0]?.id ?? '', amountXaf: 0 },
    ]);
  }

  protected remove(index: number): void {
    this.specials.update((list) => list.filter((_, i) => i !== index));
  }

  protected async saveSpecials(): Promise<void> {
    this.error.set(null);
    try {
      const saved = await this.api.setSpecialPrices(
        this.id(),
        this.specials().map((p) => ({
          ...p,
          amountXaf: Math.max(0, Math.floor(p.amountXaf)),
        })),
      );
      this.specials.set(saved);
      this.toast.success('Prix spéciaux enregistrés.');
      this.loadSpecials.reload();
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }
}
