import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { SupplierInvoiceDto } from '@lavio/shared';
import { ManagementApi } from '../../../core/api/management-api';
import { FrDatePipe, todayInput, XafPipe } from '../../../shared/format/format';
import { LV_FIELD } from '../../../shared/ui/field/field';
import { Pager } from '../../../shared/ui/pager/pager';
import { Toast } from '../../../shared/ui/toast/toast.service';

/** Dettes fournisseurs : factures, échéances, paiement (dépense « Achats matières »). */
@Component({
  selector: 'lv-invoices-panel',
  imports: [FormsModule, LV_FIELD, FrDatePipe, XafPipe, Pager],
  template: `
    <form
      class="lv-card mb-6 grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] md:items-end"
      (ngSubmit)="add()"
      aria-label="Nouvelle facture fournisseur"
    >
      <lv-field label="Fournisseur">
        <select
          lvControl
          name="supplier"
          [ngModel]="supplierId()"
          (ngModelChange)="supplierId.set($event)"
        >
          <option value="">— Choisir —</option>
          @for (s of suppliers.hasValue() ? suppliers.value() : []; track s.id) {
            <option [value]="s.id">{{ s.name }}</option>
          }
        </select>
      </lv-field>
      <lv-field label="N° de facture">
        <input
          lvControl
          maxlength="40"
          name="number"
          [ngModel]="number()"
          (ngModelChange)="number.set($event)"
        />
      </lv-field>
      <lv-field label="Montant (FCFA)" [errors]="{ min: 'Le montant doit être positif.' }">
        <input
          lvControl
          class="tabular"
          type="number"
          min="1"
          name="amount"
          [ngModel]="amount()"
          (ngModelChange)="amount.set($event)"
        />
      </lv-field>
      <lv-field label="Date">
        <input
          lvControl
          type="date"
          name="issued"
          [ngModel]="issuedOn()"
          (ngModelChange)="issuedOn.set($event)"
        />
      </lv-field>
      <lv-field label="Échéance">
        <input
          lvControl
          type="date"
          name="due"
          [ngModel]="dueOn()"
          (ngModelChange)="dueOn.set($event)"
        />
      </lv-field>
      <button
        type="submit"
        class="lv-primary"
        [disabled]="!supplierId() || !number().trim() || !(amount() ?? 0) || !issuedOn()"
      >
        Ajouter
      </button>
    </form>

    <div class="lv-toolbar justify-between" role="search">
      <label class="lv-check">
        <input
          type="checkbox"
          [ngModel]="unpaid()"
          (ngModelChange)="unpaid.set($event); page.set(1)"
        />
        Non payées seulement
      </label>
      <lv-field label="Payer depuis" class="max-w-xs">
        <select lvControl [ngModel]="payAccount()" (ngModelChange)="payAccount.set($event)">
          <option value="">Caisse (espèces)</option>
          @for (a of nonCash(); track a.id) {
            <option [value]="a.id">{{ a.name }}</option>
          }
        </select>
      </lv-field>
    </div>
    <div class="lv-table-wrap">
      <table class="lv-table">
        <caption class="sr-only">
          Factures fournisseurs
        </caption>
        <thead>
          <tr>
            <th scope="col">Fournisseur</th>
            <th scope="col">N°</th>
            <th scope="col">Date</th>
            <th scope="col">Échéance</th>
            <th scope="col">État</th>
            <th scope="col" class="num">Montant</th>
            <th scope="col"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          @for (i of list.hasValue() ? list.value().data : []; track i.id) {
            <tr>
              <td>{{ i.supplierName }}</td>
              <td class="tabular">{{ i.number }}</td>
              <td>{{ i.issuedOn | frDate }}</td>
              <td [class.font-semibold]="i.overdue" [class.text-coral-600]="i.overdue">
                {{ i.dueOn ? (i.dueOn | frDate) : '—' }}
              </td>
              <td>
                @if (i.paidAt) {
                  Payée le {{ i.paidAt | frDate }}
                } @else if (i.expenseId) {
                  Paiement à valider
                } @else if (i.overdue) {
                  <span class="lv-chip bg-coral-600 font-bold text-white">En retard</span>
                } @else {
                  À payer
                }
              </td>
              <td class="num">{{ i.amountXaf | xaf }}</td>
              <td>
                @if (!i.paidAt && !i.expenseId) {
                  <button type="button" class="lv-link-button" (click)="pay(i)">Payer</button>
                }
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="7">{{ list.isLoading() ? 'Chargement…' : 'Aucune facture.' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <lv-pager [meta]="list.hasValue() ? list.value().meta : null" (page)="page.set($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoicesPanel {
  private readonly api = inject(ManagementApi);
  private readonly toast = inject(Toast);
  protected readonly suppliers = resource({ loader: () => this.api.suppliers() });
  protected readonly accounts = resource({ loader: () => this.api.accounts() });
  protected readonly nonCash = computed(() =>
    this.accounts.hasValue()
      ? this.accounts.value().filter((a) => a.isActive && a.type !== 'CASH')
      : [],
  );
  protected readonly unpaid = signal(true);
  protected readonly page = signal(1);
  protected readonly list = resource({
    params: () => ({ unpaid: this.unpaid() || undefined, page: this.page() }),
    loader: ({ params }) => this.api.invoices(params),
  });
  protected readonly supplierId = signal('');
  protected readonly number = signal('');
  protected readonly amount = signal<number | null>(null);
  protected readonly issuedOn = signal(todayInput());
  protected readonly dueOn = signal('');
  protected readonly payAccount = signal('');

  protected async add(): Promise<void> {
    try {
      await this.api.createInvoice({
        supplierId: this.supplierId(),
        number: this.number().trim(),
        amountXaf: Number(this.amount()),
        issuedOn: this.issuedOn(),
        dueOn: this.dueOn() || undefined,
      });
      this.toast.success('Facture enregistrée.');
      this.number.set('');
      this.amount.set(null);
      this.list.reload();
    } catch (e) {
      this.toast.error(e);
    }
  }

  protected async pay(i: SupplierInvoiceDto): Promise<void> {
    try {
      const paid = await this.api.payInvoice(i.id, this.payAccount() || undefined);
      this.toast.success(
        paid.paidAt ? 'Facture payée.' : 'Paiement envoyé à la responsable pour validation.',
      );
      this.list.reload();
    } catch (e) {
      this.toast.error(e);
    }
  }
}
