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
import { CARE_SYMBOLS, type DepositItemDto, RECEPTION_CHECKLIST } from '@lavio/shared';
import { PressingApi } from '../../../core/api/pressing-api';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/http/api';
import { FrDatePipe, FrDateTimePipe, PhonePipe, XafPipe } from '../../../shared/format/format';
import { confirmAction } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { DepositChip, ItemChip } from '../../../shared/ui/status-chip/deposit-chip';
import { errorMessage, Toast } from '../../../shared/ui/toast/toast.service';
import { compressImage, uploadToBlob } from '../../../shared/upload/photo-upload';

const SYMBOL_LABELS = new Map(CARE_SYMBOLS.map((s) => [s.code, s.label]));
const CHECK_LABELS = new Map<string, string>(RECEPTION_CHECKLIST.map((c) => [c.key, c.label]));

/** Fiche d'un dépôt : articles, montants, validation de remise, impression, annulation, photos. */
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
  protected readonly correctedDiscount = signal<number | null>(null);
  protected readonly uploading = signal<string | null>(null);

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
    const ok = await confirmAction(this.dialog, {
      title: 'Annuler ce dépôt ?',
      message: 'L’annulation est définitive et tracée. Indiquez le motif.',
      confirmLabel: 'Annuler le dépôt',
      danger: true,
      reasonRequired: true,
    });
    if (ok?.reason)
      await this.run(() => this.api.cancelDeposit(this.id(), ok.reason ?? ''), 'Dépôt annulé.');
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
