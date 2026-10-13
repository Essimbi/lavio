import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaymentMethod, TreasuryAccountType } from '@lavio/shared';
import { ManagementApi } from '../../../core/api/management-api';
import { FrDateTimePipe, XafPipe } from '../../../shared/format/format';
import { ACCOUNT_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '../../../shared/format/labels';
import { Toast } from '../../../shared/ui/toast/toast.service';

/** Comptes de trésorerie (soldes calculés), virements, nouveau compte. */
@Component({
  selector: 'lv-treasury-panel',
  imports: [FormsModule, XafPipe, FrDateTimePipe],
  template: `
    <div class="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      @for (a of active(); track a.id) {
        <article class="lv-card">
          <p class="text-sm">{{ typeLabels[a.type] }}</p>
          <h3 class="text-lg font-semibold">{{ a.name }}</h3>
          <p class="tabular text-2xl font-semibold" [class.text-coral-600]="a.balanceXaf < 0">
            {{ a.balanceXaf | xaf }}
          </p>
          @if (a.paymentMethods.length) {
            <p class="mt-1 text-sm">Encaissements : {{ methodsOf(a.paymentMethods) }}</p>
          }
        </article>
      }
    </div>
    <p class="mb-6 text-lg">
      Trésorerie totale : <strong class="tabular">{{ total() | xaf }}</strong>
    </p>

    <div class="grid gap-6 xl:grid-cols-2">
      <form class="lv-card grid gap-3" (ngSubmit)="transfer()" aria-labelledby="transfer-title">
        <h3 id="transfer-title" class="text-lg">Virement entre comptes</h3>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="lv-label" for="tr-from">Depuis</label>
            <select
              id="tr-from"
              class="lv-select"
              name="from"
              [ngModel]="from()"
              (ngModelChange)="from.set($event)"
            >
              <option value="">— Choisir —</option>
              @for (a of active(); track a.id) {
                <option [value]="a.id">{{ a.name }}</option>
              }
            </select>
          </div>
          <div>
            <label class="lv-label" for="tr-to">Vers</label>
            <select
              id="tr-to"
              class="lv-select"
              name="to"
              [ngModel]="to()"
              (ngModelChange)="to.set($event)"
            >
              <option value="">— Choisir —</option>
              @for (a of active(); track a.id) {
                <option [value]="a.id">{{ a.name }}</option>
              }
            </select>
          </div>
          <div>
            <label class="lv-label" for="tr-amount">Montant (FCFA)</label>
            <input
              id="tr-amount"
              class="lv-input tabular"
              type="number"
              min="1"
              name="amount"
              [ngModel]="amount()"
              (ngModelChange)="amount.set($event)"
            />
          </div>
          <div>
            <label class="lv-label" for="tr-note">Note</label>
            <input
              id="tr-note"
              class="lv-input"
              maxlength="500"
              name="note"
              [ngModel]="note()"
              (ngModelChange)="note.set($event)"
            />
          </div>
        </div>
        <p class="text-sm">
          Un virement n’est jamais modifié : une erreur se corrige par un virement inverse.
        </p>
        <button
          type="submit"
          class="lv-primary justify-self-start"
          [disabled]="!from() || !to() || from() === to() || !(amount() ?? 0)"
        >
          Enregistrer le virement
        </button>
      </form>

      <form class="lv-card grid gap-3" (ngSubmit)="addAccount()" aria-labelledby="account-title">
        <h3 id="account-title" class="text-lg">Nouveau compte</h3>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="lv-label" for="acc-name">Nom</label>
            <input
              id="acc-name"
              class="lv-input"
              maxlength="60"
              name="name"
              [ngModel]="name()"
              (ngModelChange)="name.set($event)"
            />
          </div>
          <div>
            <label class="lv-label" for="acc-type">Type</label>
            <select
              id="acc-type"
              class="lv-select"
              name="type"
              [ngModel]="type()"
              (ngModelChange)="type.set($event)"
            >
              @for (t of types; track t) {
                <option [value]="t">{{ typeLabels[t] }}</option>
              }
            </select>
          </div>
          <div>
            <label class="lv-label" for="acc-opening">Solde d’ouverture (FCFA)</label>
            <input
              id="acc-opening"
              class="lv-input tabular"
              type="number"
              name="opening"
              [ngModel]="opening()"
              (ngModelChange)="opening.set($event)"
            />
          </div>
        </div>
        <button
          type="submit"
          class="lv-secondary justify-self-start"
          [disabled]="name().trim().length < 2"
        >
          Créer le compte
        </button>
      </form>
    </div>

    <h3 class="mt-8 mb-3 text-lg">Derniers virements</h3>
    <div class="lv-table-wrap">
      <table class="lv-table">
        <caption class="sr-only">
          Virements entre comptes
        </caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Depuis</th>
            <th scope="col">Vers</th>
            <th scope="col">Note</th>
            <th scope="col" class="num">Montant</th>
          </tr>
        </thead>
        <tbody>
          @for (t of transfers.hasValue() ? transfers.value() : []; track t.id) {
            <tr>
              <td>{{ t.at | frDateTime }}</td>
              <td>{{ t.fromAccountName }}</td>
              <td>{{ t.toAccountName }}</td>
              <td>{{ t.note ?? '—' }}</td>
              <td class="num">{{ t.amountXaf | xaf }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5">{{ transfers.isLoading() ? 'Chargement…' : 'Aucun virement.' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreasuryPanel {
  private readonly api = inject(ManagementApi);
  private readonly toast = inject(Toast);
  protected readonly typeLabels = ACCOUNT_TYPE_LABELS;
  protected readonly types = Object.keys(TreasuryAccountType) as TreasuryAccountType[];
  protected readonly accounts = resource({ loader: () => this.api.accounts() });
  protected readonly transfers = resource({ loader: () => this.api.transfers() });
  protected readonly active = computed(() =>
    this.accounts.hasValue() ? this.accounts.value().filter((a) => a.isActive) : [],
  );
  protected readonly total = computed(() => this.active().reduce((s, a) => s + a.balanceXaf, 0));
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly amount = signal<number | null>(null);
  protected readonly note = signal('');
  protected readonly name = signal('');
  protected readonly type = signal<TreasuryAccountType>('BANK');
  protected readonly opening = signal<number | null>(0);

  protected methodsOf(methods: PaymentMethod[]): string {
    return methods.map((m) => PAYMENT_METHOD_LABELS[m]).join(', ');
  }

  protected async transfer(): Promise<void> {
    try {
      await this.api.transfer({
        fromAccountId: this.from(),
        toAccountId: this.to(),
        amountXaf: Number(this.amount()),
        note: this.note().trim() || undefined,
      });
      this.toast.success('Virement enregistré.');
      this.amount.set(null);
      this.note.set('');
      this.accounts.reload();
      this.transfers.reload();
    } catch (e) {
      this.toast.error(e);
    }
  }

  protected async addAccount(): Promise<void> {
    try {
      await this.api.createAccount({
        name: this.name().trim(),
        type: this.type(),
        openingBalanceXaf: Math.floor(this.opening() ?? 0),
      });
      this.toast.success('Compte créé.');
      this.name.set('');
      this.accounts.reload();
    } catch (e) {
      this.toast.error(e);
    }
  }
}
