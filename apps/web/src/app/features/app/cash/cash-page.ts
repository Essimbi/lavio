import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CashSessionDto, PaymentMethod } from '@lavio/shared';
import { AuthService } from '../../../core/auth/auth.service';
import { PressingApi } from '../../../core/api/pressing-api';
import { formatXaf, FrDateTimePipe, XafPipe } from '../../../shared/format/format';
import { CASH_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '../../../shared/format/labels';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Pager } from '../../../shared/ui/pager/pager';
import { Toast } from '../../../shared/ui/toast/toast.service';

/**
 * Caisse journalière (docs/05, « Caisse ») : une session ouverte à la fois, attendu calculé,
 * comptage, écart avec note obligatoire, clôture validée par la responsable.
 */
@Component({
  selector: 'lv-cash-page',
  imports: [FormsModule, PageHeader, Pager, FrDateTimePipe, XafPipe],
  templateUrl: './cash-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashPage {
  private readonly api = inject(PressingApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(Toast);

  protected readonly statusLabels = CASH_STATUS_LABELS;
  protected readonly isCashier = computed(() => this.auth.hasTenantRole('CASHIER'));
  protected readonly isOwner = computed(() => this.auth.hasTenantRole());
  protected readonly openingFloat = signal<number | null>(null);
  protected readonly counted = signal<number | null>(null);
  protected readonly note = signal('');
  protected readonly busy = signal(false);
  protected readonly page = signal(1);
  protected readonly selectedId = signal<string | null>(null);

  protected readonly current = resource({ loader: () => this.api.currentCash() });
  protected readonly history = resource({
    params: () => this.page(),
    loader: ({ params }) => this.api.cashSessions(params),
  });
  /** Journal de la session choisie dans l'historique, sinon de la session en cours. */
  protected readonly journalId = computed(
    () => this.selectedId() ?? (this.current.hasValue() ? this.current.value()?.id : undefined),
  );
  protected readonly journal = resource({
    params: () => this.journalId() ?? undefined,
    loader: ({ params }) => this.api.cashJournal(params),
  });

  protected readonly variance = computed(() => {
    const session = this.current.hasValue() ? this.current.value() : null;
    const counted = this.counted();
    if (!session || counted === null) return null;
    return Math.floor(counted) - session.expectedCashXaf;
  });
  protected readonly noteRequired = computed(() => (this.variance() ?? 0) !== 0);
  protected readonly canClose = computed(
    () =>
      this.variance() !== null &&
      (this.counted() ?? -1) >= 0 &&
      (!this.noteRequired() || this.note().trim().length >= 3),
  );

  protected readonly otherMethods = computed(() => {
    if (!this.journal.hasValue()) return [];
    return Object.entries(this.journal.value().otherMethodsXaf)
      .filter(([, v]) => !!v)
      .map(([m, v]) => ({ label: PAYMENT_METHOD_LABELS[m as PaymentMethod], amount: v }));
  });

  protected readonly signed = (v: number) =>
    v > 0 ? `+ ${formatXaf(v)}` : v < 0 ? `− ${formatXaf(-v)}` : formatXaf(0);

  private refresh(): void {
    this.current.reload();
    this.history.reload();
    this.journal.reload();
  }

  protected async open(): Promise<void> {
    const amount = Math.floor(this.openingFloat() ?? 0);
    if (amount < 0) return;
    this.busy.set(true);
    try {
      await this.api.openCash(amount);
      this.toast.success('Caisse ouverte.');
      this.openingFloat.set(null);
      this.selectedId.set(null);
      this.refresh();
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.busy.set(false);
    }
  }

  protected async close(session: CashSessionDto): Promise<void> {
    if (!this.canClose()) return;
    this.busy.set(true);
    try {
      const done = await this.api.closeCash(
        session.id,
        Math.floor(this.counted() ?? 0),
        this.note().trim() || undefined,
      );
      this.toast.success(
        done.status === 'CLOSED'
          ? 'Caisse clôturée.'
          : 'Clôture envoyée à la responsable pour validation.',
      );
      this.counted.set(null);
      this.note.set('');
      this.refresh();
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}
