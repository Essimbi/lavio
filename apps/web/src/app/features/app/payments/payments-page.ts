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
import { Router, RouterLink } from '@angular/router';
import { isMobileMoney, PaymentMethod, type PaymentDto, type ReceivableDto } from '@lavio/shared';
import { type PaymentFilters, PressingApi } from '../../../core/api/pressing-api';
import { AuthService } from '../../../core/auth/auth.service';
import {
  dateInputToIso,
  FrDatePipe,
  FrDateTimePipe,
  PhonePipe,
  XafPipe,
} from '../../../shared/format/format';
import {
  PAYMENT_KIND_LABELS,
  PAYMENT_METHOD_LABELS,
  saveBlob,
} from '../../../shared/format/labels';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Pager } from '../../../shared/ui/pager/pager';
import { Toast } from '../../../shared/ui/toast/toast.service';
import { openPaymentDialog } from './payment-dialog';

type Tab = 'payments' | 'receivables';
type Reconciled = '' | 'yes' | 'no';

/** Paiements (docs/01, module 4) : liste filtrable, rapprochement Mobile Money, export, créances. */
@Component({
  selector: 'lv-payments-page',
  imports: [
    FormsModule,
    RouterLink,
    PageHeader,
    Pager,
    FrDatePipe,
    FrDateTimePipe,
    PhonePipe,
    XafPipe,
  ],
  templateUrl: './payments-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentsPage {
  /** Onglet ouvert (`?tab=receivables`). */
  readonly tab = input<string>();
  /** Le routeur passe `undefined` sans paramètre : vue « Paiements » par défaut. */
  protected readonly view = computed<Tab>(() =>
    this.tab() === 'receivables' ? 'receivables' : 'payments',
  );
  private readonly api = inject(PressingApi);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly toast = inject(Toast);

  protected readonly methods = Object.keys(PaymentMethod) as PaymentMethod[];
  protected readonly methodLabels = PAYMENT_METHOD_LABELS;
  protected readonly kindLabels = PAYMENT_KIND_LABELS;
  protected readonly isMobileMoney = isMobileMoney;
  protected readonly isCashier = computed(() => this.auth.hasTenantRole('CASHIER'));

  protected readonly method = signal<PaymentMethod | ''>('');
  protected readonly mobileMoney = signal(false);
  protected readonly reconciled = signal<Reconciled>('');
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly page = signal(1);
  protected readonly exporting = signal(false);

  private readonly filters = computed<PaymentFilters>(() => ({
    method: this.mobileMoney() ? undefined : this.method(),
    mobileMoney: this.mobileMoney() || undefined,
    reconciled: this.reconciled() === '' ? undefined : this.reconciled() === 'yes',
    from: this.from() ? dateInputToIso(this.from()) : undefined,
    // Borne haute exclusive : lendemain de la date saisie, minuit à Douala.
    to: this.to()
      ? new Date(Date.parse(dateInputToIso(this.to())) + 86_400_000).toISOString()
      : undefined,
  }));

  protected readonly list = resource({
    params: () =>
      this.view() === 'payments' ? { ...this.filters(), page: this.page() } : undefined,
    loader: ({ params }) => this.api.payments(params),
  });
  protected readonly receivables = resource({
    params: () => (this.view() === 'receivables' ? true : undefined),
    loader: () => this.api.receivables(),
  });
  protected readonly receivablesTotal = computed(() =>
    this.receivables.hasValue() ? this.receivables.value().reduce((s, r) => s + r.totalXaf, 0) : 0,
  );

  protected show(tab: Tab): Promise<boolean> {
    return this.router.navigate([], { queryParams: { tab: tab === 'payments' ? null : tab } });
  }

  protected async reconcile(p: PaymentDto, on: boolean): Promise<void> {
    try {
      await this.api.reconcilePayment(p.id, on);
      this.toast.success(on ? 'Paiement rapproché.' : 'Rapprochement retiré.');
      this.list.reload();
    } catch (e) {
      this.toast.error(e);
      this.list.reload();
    }
  }

  protected async exportCsv(): Promise<void> {
    this.exporting.set(true);
    try {
      saveBlob(await this.api.exportMobileMoney(this.filters()), 'lavio-mobile-money.csv');
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.exporting.set(false);
    }
  }

  protected async settle(r: ReceivableDto, d: ReceivableDto['deposits'][number]): Promise<void> {
    const payment = await openPaymentDialog(this.dialog, {
      depositId: d.id,
      ticketNumber: d.ticketNumber,
      balanceXaf: d.balanceXaf,
      kind: d.status === 'COMPLETED' ? 'CREDIT_SETTLEMENT' : 'BALANCE',
    });
    if (!payment) return;
    this.toast.success(`Règlement de ${r.customerName} enregistré.`);
    this.receivables.reload();
  }
}
