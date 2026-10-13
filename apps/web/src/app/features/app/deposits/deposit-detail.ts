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
import { RouterLink } from '@angular/router';
import {
  CARE_SYMBOLS,
  type DepositItemDto,
  type PaymentDto,
  type PaymentKind,
  PaymentMethod,
  RECEPTION_CHECKLIST,
  isMobileMoney,
} from '@lavio/shared';
import { PressingApi } from '../../../core/api/pressing-api';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/http/api';
import { FrDatePipe, FrDateTimePipe, PhonePipe, XafPipe } from '../../../shared/format/format';
import {
  INCIDENT_RESOLUTION_LABELS,
  INCIDENT_TYPE_LABELS,
  PAYMENT_KIND_LABELS,
  PAYMENT_METHOD_LABELS,
  saveBlob,
} from '../../../shared/format/labels';
import { confirmAction } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { DepositChip, ItemChip } from '../../../shared/ui/status-chip/deposit-chip';
import { errorMessage, Toast } from '../../../shared/ui/toast/toast.service';
import { compressImage, uploadToBlob } from '../../../shared/upload/photo-upload';
import { openPaymentDialog } from '../payments/payment-dialog';

const SYMBOL_LABELS = new Map(CARE_SYMBOLS.map((s) => [s.code, s.label]));
const CHECK_LABELS = new Map<string, string>(RECEPTION_CHECKLIST.map((c) => [c.key, c.label]));

/**
 * Fiche d'un dépôt : articles, montants, validation de remise, impression, photos, paiements,
 * restitution, incidents, reçu et facture, annulation avec remboursement.
 */
@Component({
  selector: 'lv-deposit-detail',
  imports: [
    FormsModule,
    RouterLink,
    PageHeader,
    DepositChip,
    ItemChip,
    FrDatePipe,
    FrDateTimePipe,
    PhonePipe,
    XafPipe,
  ],
  templateUrl: './deposit-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepositDetail {
  readonly id = input.required<string>();
  private readonly api = inject(PressingApi);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(Toast);
  protected readonly auth = inject(AuthService);
  protected readonly deposit = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.deposit(params),
  });
  protected readonly isCashier = computed(() => this.auth.hasTenantRole('CASHIER'));
  protected readonly canSeePayments = computed(() =>
    this.auth.hasTenantRole('CASHIER', 'ACCOUNTANT'),
  );
  protected readonly canSeeIncidents = computed(() =>
    this.auth.hasTenantRole('CASHIER', 'OPERATOR', 'ACCOUNTANT', 'QUALITY', 'DRIVER'),
  );
  protected readonly payments = resource({
    params: () => (this.canSeePayments() ? this.id() : undefined),
    loader: ({ params }) => this.api.payments({ depositId: params }),
  });
  protected readonly incidents = resource({
    params: () => (this.canSeeIncidents() ? this.id() : undefined),
    loader: ({ params }) => this.api.incidents({ depositId: params }),
  });
  protected readonly correctedDiscount = signal<number | null>(null);
  protected readonly uploading = signal<string | null>(null);
  protected readonly toReturn = signal<ReadonlySet<string>>(new Set());
  protected readonly returning = signal(false);
  protected readonly refundMethod = signal<PaymentMethod>('CASH');
  protected readonly refundRef = signal('');
  protected readonly methods = Object.keys(PaymentMethod) as PaymentMethod[];
  protected readonly methodLabels = PAYMENT_METHOD_LABELS;
  protected readonly kindLabels = PAYMENT_KIND_LABELS;
  protected readonly incidentLabels = INCIDENT_TYPE_LABELS;
  protected readonly resolutionLabels = INCIDENT_RESOLUTION_LABELS;
  protected readonly isMobileMoney = isMobileMoney;

  protected readonly readyItems = computed(() =>
    this.deposit.hasValue() ? this.deposit.value().items.filter((i) => i.status === 'READY') : [],
  );
  /** Encaissement possible : dépôt validé, non annulé, avec un reste à payer. */
  protected readonly payable = computed(
    () =>
      this.deposit.hasValue() &&
      this.deposit.value().balanceXaf > 0 &&
      !['DRAFT', 'PENDING_APPROVAL', 'CANCELLED'].includes(this.deposit.value().status),
  );
  protected readonly hasPayments = computed(
    () => this.deposit.hasValue() && this.deposit.value().paidXaf > 0,
  );

  protected readonly cancellable = computed(
    () =>
      this.deposit.hasValue() &&
      this.deposit.value().status !== 'CANCELLED' &&
      this.deposit.value().items.every((i) => i.status === 'RECEIVED'),
  );

  protected readonly details = (i: DepositItemDto) =>
    [i.color, i.brand].filter((x) => !!x).join(' · ');
  protected readonly symbols = (i: DepositItemDto) =>
    i.careSymbols.map((c) => SYMBOL_LABELS.get(c) ?? c).join(', ');
  protected readonly checks = (i: DepositItemDto) =>
    Object.entries(i.checklist)
      .filter(([, on]) => on)
      .map(([k]) => CHECK_LABELS.get(k) ?? k)
      .join(', ');

  private async run(action: () => Promise<unknown>, message: string): Promise<void> {
    try {
      await action();
      this.toast.success(message);
      this.deposit.reload();
    } catch (e) {
      this.toast.error(e);
    }
  }

  protected approve = (approvalId: string) =>
    this.run(() => this.api.approve(approvalId), 'Remise validée : le ticket peut être imprimé.');

  protected async reject(approvalId: string): Promise<void> {
    const ok = await confirmAction(this.dialog, {
      title: 'Refuser cette remise ?',
      message:
        'Le dépôt repassera en brouillon : le caissier corrigera la remise ou annulera le dépôt.',
      confirmLabel: 'Refuser',
      danger: true,
      askReason: true,
    });
    if (ok) await this.run(() => this.api.reject(approvalId, ok.reason), 'Remise refusée.');
  }

  protected async fixDiscount(): Promise<void> {
    const value = this.correctedDiscount();
    if (value === null || value < 0) return;
    await this.run(
      () => this.api.updateDeposit(this.id(), { discountXaf: Math.floor(value) }),
      'Remise corrigée.',
    );
    this.correctedDiscount.set(null);
  }

  protected async cancel(): Promise<void> {
    const paid = this.deposit.hasValue() ? this.deposit.value().paidXaf : 0;
    const method = this.refundMethod();
    const ok = await confirmAction(this.dialog, {
      title: 'Annuler ce dépôt ?',
      message: paid
        ? `L’annulation est définitive et tracée. Les ${paid.toLocaleString('fr-FR')} FCFA déjà payés seront remboursés (${PAYMENT_METHOD_LABELS[method]}). Indiquez le motif.`
        : 'L’annulation est définitive et tracée. Indiquez le motif.',
      confirmLabel: 'Annuler le dépôt',
      danger: true,
      reasonRequired: true,
    });
    if (!ok?.reason) return;
    await this.run(
      () =>
        this.api.cancelDeposit(this.id(), {
          reason: ok.reason ?? '',
          refundMethod: paid ? method : undefined,
          refundRef: paid && isMobileMoney(method) ? this.refundRef().trim() : undefined,
        }),
      'Dépôt annulé.',
    );
    this.payments.reload();
  }

  protected toggleReturn(id: string, on: boolean): void {
    this.toReturn.update((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  /** Restitution : sans solde ou client à crédit sous son plafond, sinon validation (docs/05). */
  protected async returnItems(): Promise<void> {
    const ids = [...this.toReturn()];
    if (!ids.length) return;
    this.returning.set(true);
    try {
      const result = await this.api.returnItems(this.id(), ids);
      if (result.outcome === 'approval')
        this.toast.success(
          'Reste à payer non réglé : vente à crédit envoyée à la responsable pour validation.',
        );
      else this.toast.success(`${ids.length} article(s) restitué(s).`);
      this.toReturn.set(new Set());
      this.deposit.reload();
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.returning.set(false);
    }
  }

  protected async pay(): Promise<void> {
    if (!this.deposit.hasValue()) return;
    const d = this.deposit.value();
    const kind: PaymentKind =
      d.status === 'COMPLETED'
        ? 'CREDIT_SETTLEMENT'
        : d.items.some((i) => i.status === 'READY' || i.status === 'RETURNED')
          ? 'BALANCE'
          : 'ADVANCE';
    const payment = await openPaymentDialog(this.dialog, {
      depositId: d.id,
      ticketNumber: d.ticketNumber,
      balanceXaf: d.balanceXaf,
      kind,
    });
    if (!payment) return;
    this.toast.success('Paiement enregistré.');
    this.deposit.reload();
    this.payments.reload();
  }

  protected async reverse(p: PaymentDto): Promise<void> {
    const ok = await confirmAction(this.dialog, {
      title: 'Annuler ce paiement ?',
      message:
        'Une écriture inverse est enregistrée ; le paiement d’origine reste visible et tracé.',
      confirmLabel: 'Annuler le paiement',
      danger: true,
      reasonRequired: true,
    });
    if (!ok?.reason) return;
    await this.run(() => this.api.reversePayment(p.id, ok.reason ?? ''), 'Paiement annulé.');
    this.payments.reload();
  }

  protected async invoice(): Promise<void> {
    if (!this.deposit.hasValue()) return;
    try {
      saveBlob(
        await this.api.invoicePdf(this.id()),
        `facture-${this.deposit.value().ticketNumber}.pdf`,
      );
    } catch (e) {
      this.toast.error(e);
    }
  }

  /** Photo facultative (docs/09) : compressée, envoyée directement vers Vercel Blob, puis rattachée. */
  protected async addPhoto(item: DepositItemDto, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.toast.error(new ApiError('VALIDATION_FAILED', 'Choisissez une image.', 400));
      return;
    }
    this.uploading.set(item.id);
    try {
      const token = await this.api.photoUploadToken(this.id(), item.id);
      const url = await uploadToBlob(token, await compressImage(file));
      await this.api.attachPhoto(this.id(), item.id, url);
      this.toast.success('Photo ajoutée.');
      this.deposit.reload();
    } catch (e) {
      this.toast.error(
        e instanceof ApiError
          ? e
          : new ApiError('INTERNAL_ERROR', e instanceof Error ? e.message : errorMessage(e), 0),
      );
    } finally {
      this.uploading.set(null);
    }
  }
}
