import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { type DepositStatus, parseTicketNumber } from '@lavio/shared';
import { PressingApi } from '../../../core/api/pressing-api';
import { AuthService } from '../../../core/auth/auth.service';
import { FrDatePipe, XafPipe } from '../../../shared/format/format';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Pager } from '../../../shared/ui/pager/pager';
import { DEPOSIT_STATUS_LABELS, DepositChip } from '../../../shared/ui/status-chip/deposit-chip';
import { errorMessage } from '../../../shared/ui/toast/toast.service';

/**
 * Liste des dépôts : recherche par numéro, client ou téléphone ; filtres par statut, date de
 * retrait prévue et retards.
 */
@Component({
  selector: 'lv-deposits-page',
  imports: [FormsModule, RouterLink, PageHeader, Pager, DepositChip, FrDatePipe, XafPipe],
  template: `
    <lv-page-header heading="Dépôts" subtitle="Retrouvez un dépôt par son numéro de ticket.">
      @if (auth.hasTenantRole('CASHIER')) {
        <a class="lv-primary" routerLink="/app/deposits/new">Nouveau dépôt</a>
      }
    </lv-page-header>

    <form class="mb-4 flex flex-wrap items-end gap-3" (ngSubmit)="open()">
      <div class="min-w-64 grow">
        <label class="lv-label" for="deposit-search">Numéro de ticket, client ou téléphone</label>
        <input
          id="deposit-search"
          class="lv-input"
          type="search"
          autocomplete="off"
          [ngModel]="q()"
          (ngModelChange)="q.set($event); page.set(1)"
          name="q"
        />
      </div>
      <div>
        <label class="lv-label" for="deposit-status">Statut</label>
        <select
          id="deposit-status"
          class="lv-select"
          [ngModel]="status()"
          (ngModelChange)="status.set($event); page.set(1)"
          name="status"
        >
          <option value="">Tous</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ labels[s] }}</option>
          }
        </select>
      </div>
      <fieldset class="flex items-end gap-2">
        <legend class="lv-label">Retrait prévu</legend>
        <div>
          <label class="sr-only" for="deposit-due-from">Retrait à partir du</label>
          <input
            id="deposit-due-from"
            class="lv-input"
            type="date"
            [ngModel]="dueFrom()"
            (ngModelChange)="dueFrom.set($event ?? ''); page.set(1)"
            name="dueFrom"
            [max]="dueTo() || null"
          />
        </div>
        <span class="pb-3" aria-hidden="true">au</span>
        <div>
          <label class="sr-only" for="deposit-due-to">Retrait jusqu’au</label>
          <input
            id="deposit-due-to"
            class="lv-input"
            type="date"
            [ngModel]="dueTo()"
            (ngModelChange)="dueTo.set($event ?? ''); page.set(1)"
            name="dueTo"
            [min]="dueFrom() || null"
          />
        </div>
        @if (dueFrom() || dueTo()) {
          <button type="button" class="lv-link-button pb-3" (click)="clearDue()">Effacer</button>
        }
      </fieldset>
      <label class="flex min-h-11 items-center gap-2"
        ><input
          type="checkbox"
          [ngModel]="late()"
          (ngModelChange)="late.set($event); page.set(1)"
          name="late"
        />
        En retard</label
      >
      <button type="submit" class="lv-secondary">Ouvrir le n°</button>
    </form>
    @if (error()) {
      <p class="lv-alert mb-4" role="alert">{{ error() }}</p>
    }

    <div class="lv-table-wrap">
      <table class="lv-table">
        <caption class="sr-only">
          Dépôts
        </caption>
        <thead>
          <tr>
            <th scope="col">N°</th>
            <th scope="col">Client</th>
            <th scope="col">Déposé le</th>
            <th scope="col">Retrait</th>
            <th scope="col">Statut</th>
            <th scope="col" class="num">Total</th>
            <th scope="col" class="num">Reste</th>
          </tr>
        </thead>
        <tbody>
          @for (d of list.hasValue() ? list.value().data : []; track d.id) {
            <tr>
              <td>
                <a class="tabular font-semibold" [routerLink]="['/app/deposits', d.id]">{{
                  d.ticketNumber
                }}</a>
              </td>
              <td>{{ d.customer.name }}</td>
              <td>{{ d.receivedAt | frDate }}</td>
              <td>{{ d.dueDate | frDate }}</td>
              <td><lv-deposit-chip [status]="d.status" [late]="d.late" /></td>
              <td class="num">{{ d.totalXaf | xaf }}</td>
              <td class="num">{{ d.balanceXaf | xaf }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="7">{{ list.isLoading() ? 'Chargement…' : 'Aucun dépôt.' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <lv-pager [meta]="list.hasValue() ? list.value().meta : null" (page)="page.set($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepositsPage {
  private readonly api = inject(PressingApi);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly statuses = Object.keys(DEPOSIT_STATUS_LABELS) as DepositStatus[];
  protected readonly labels = DEPOSIT_STATUS_LABELS;
  protected readonly q = signal('');
  protected readonly status = signal<DepositStatus | ''>('');
  protected readonly late = signal(false);
  protected readonly dueFrom = signal('');
  protected readonly dueTo = signal('');
  protected readonly page = signal(1);
  protected readonly error = signal<string | null>(null);
  protected readonly list = resource({
    params: () => ({
      q: this.q().trim(),
      status: this.status(),
      late: this.late() || undefined,
      dueFrom: this.dueFrom(),
      dueTo: this.dueTo(),
      page: this.page(),
    }),
    loader: ({ params }) => this.api.deposits(params),
  });

  protected clearDue(): void {
    this.dueFrom.set('');
    this.dueTo.set('');
    this.page.set(1);
  }

  /** Entrée sur un numéro : ouverture directe du dépôt (avec ou sans zéros initiaux). */
  protected async open(): Promise<void> {
    const number = parseTicketNumber(this.q());
    if (number === null) return;
    try {
      const deposit = await this.api.depositByNumber(String(number));
      await this.router.navigate(['/app/deposits', deposit.id]);
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }
}
