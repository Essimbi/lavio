import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { isMobileMoney, PaymentKind, PaymentMethod, type PaymentDto } from '@lavio/shared';
import { firstValueFrom } from 'rxjs';
import { PressingApi } from '../../../core/api/pressing-api';
import { ApiError } from '../../../core/http/api';
import { XafPipe } from '../../../shared/format/format';
import { PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS } from '../../../shared/format/labels';
import { LV_FIELD } from '../../../shared/ui/field/field';
import { errorMessage } from '../../../shared/ui/toast/toast.service';

export interface PaymentDialogData {
  depositId: string;
  ticketNumber: string;
  balanceXaf: number;
  kind: PaymentKind;
}

/**
 * Encaissement (docs/05, « Paiements ») : montant au plus égal au reste à payer, référence
 * obligatoire pour Mobile Money, doublon de référence confirmé explicitement, idempotent.
 */
@Component({
  selector: 'lv-payment-dialog',
  imports: [MatDialogModule, MatButtonModule, FormsModule, LV_FIELD, RouterLink, XafPipe],
  template: `
    <h2 mat-dialog-title>Encaisser · dépôt n° {{ data.ticketNumber }}</h2>
    <form (ngSubmit)="submit()" id="payment-form">
      <mat-dialog-content class="grid gap-4">
        <p class="tabular">
          Reste à payer : <strong>{{ data.balanceXaf | xaf }}</strong>
        </p>
        <lv-field
          label="Montant (FCFA)"
          [errors]="{
            required: 'Indiquez le montant.',
            min: 'Le montant doit être positif.',
            max: 'Le montant dépasse le reste à payer.',
          }"
        >
          <input
            lvControl
            class="tabular"
            type="number"
            inputmode="numeric"
            min="1"
            [max]="data.balanceXaf"
            name="amount"
            required
            [ngModel]="amount()"
            (ngModelChange)="amount.set($event)"
          />
        </lv-field>
        <fieldset>
          <legend class="lv-label">Mode de paiement</legend>
          <div class="flex flex-wrap gap-2">
            @for (m of methods; track m) {
              <label class="lv-choice">
                <input
                  type="radio"
                  name="method"
                  [value]="m"
                  [ngModel]="method()"
                  (ngModelChange)="method.set($event); duplicate.set(false)"
                />
                {{ methodLabels[m] }}
              </label>
            }
          </div>
        </fieldset>
        <lv-field label="Nature">
          <select lvControl name="kind" [ngModel]="kind()" (ngModelChange)="kind.set($event)">
            @for (k of kinds; track k) {
              <option [value]="k">{{ kindLabels[k] }}</option>
            }
          </select>
        </lv-field>
        @if (mobileMoney()) {
          <div class="grid gap-4 sm:grid-cols-2">
            <lv-field
              label="Référence de la transaction"
              [errors]="{ required: 'Indiquez la référence de la transaction.' }"
            >
              <input
                lvControl
                name="operatorRef"
                autocomplete="off"
                required
                maxlength="60"
                [ngModel]="operatorRef()"
                (ngModelChange)="operatorRef.set($event); duplicate.set(false)"
              />
            </lv-field>
            <lv-field label="Téléphone du payeur (facultatif)">
              <input
                lvControl
                name="payerPhone"
                inputmode="tel"
                autocomplete="off"
                [ngModel]="payerPhone()"
                (ngModelChange)="payerPhone.set($event)"
              />
            </lv-field>
          </div>
        }
        @if (duplicate()) {
          <div class="lv-alert" role="alert">
            <p class="font-semibold">Cette référence a déjà été enregistrée.</p>
            <label class="mt-2 flex items-start gap-2">
              <input
                type="checkbox"
                name="confirmDuplicate"
                [ngModel]="confirmDuplicate()"
                (ngModelChange)="confirmDuplicate.set($event)"
              />
              J’ai vérifié sur le relevé de l’opérateur : il s’agit bien d’un autre paiement.
            </label>
          </div>
        }
        @if (error(); as e) {
          <p class="lv-alert" role="alert">
            {{ e }}
            @if (needsCash()) {
              <a routerLink="/app/cash" (click)="ref.close()">Ouvrir la caisse</a>
            }
          </p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Annuler</button>
        <button
          mat-flat-button
          type="submit"
          [disabled]="busy() || !valid() || (duplicate() && !confirmDuplicate())"
        >
          {{ busy() ? 'Enregistrement…' : 'Enregistrer le paiement' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentDialog {
  protected readonly data = inject<PaymentDialogData>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<PaymentDialog, PaymentDto>);
  private readonly api = inject(PressingApi);
  protected readonly methods = Object.keys(PaymentMethod) as PaymentMethod[];
  protected readonly kinds = (Object.keys(PaymentKind) as PaymentKind[]).filter(
    (k) => k !== 'REFUND',
  );
  protected readonly methodLabels = PAYMENT_METHOD_LABELS;
  protected readonly kindLabels = PAYMENT_KIND_LABELS;

  protected readonly amount = signal<number | null>(this.data.balanceXaf);
  protected readonly method = signal<PaymentMethod>('CASH');
  protected readonly kind = signal<PaymentKind>(this.data.kind);
  protected readonly operatorRef = signal('');
  protected readonly payerPhone = signal('');
  protected readonly duplicate = signal(false);
  protected readonly confirmDuplicate = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly needsCash = signal(false);
  /** Une clé par tentative : un renvoi après coupure réseau ne crée pas de doublon. */
  private key = crypto.randomUUID();

  protected readonly mobileMoney = computed(() => isMobileMoney(this.method()));
  protected readonly valid = computed(() => {
    const amount = Number(this.amount());
    return (
      Number.isInteger(amount) &&
      amount > 0 &&
      amount <= this.data.balanceXaf &&
      (!this.mobileMoney() || this.operatorRef().trim().length >= 3)
    );
  });

  protected async submit(): Promise<void> {
    if (!this.valid() || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    this.needsCash.set(false);
    try {
      const mm = this.mobileMoney();
      const payment = await this.api.createPayment(
        {
          depositId: this.data.depositId,
          amountXaf: Number(this.amount()),
          method: this.method(),
          kind: this.kind(),
          operatorRef: mm ? this.operatorRef().trim() : undefined,
          payerPhone: mm && this.payerPhone().trim() ? this.payerPhone().trim() : undefined,
          confirmDuplicate: this.duplicate() && this.confirmDuplicate() ? true : undefined,
        },
        this.key,
      );
      this.ref.close(payment);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'DUPLICATE_REFERENCE') {
        this.duplicate.set(true);
        this.key = crypto.randomUUID();
      } else {
        // Même clé après une coupure ou une mise en file : un nouvel envoi ne crée pas de doublon.
        if (e instanceof ApiError && !e.isNetworkError && !e.isQueued)
          this.key = crypto.randomUUID();
        this.needsCash.set(e instanceof ApiError && e.code === 'CASH_SESSION_REQUIRED');
        this.error.set(errorMessage(e));
      }
    } finally {
      this.busy.set(false);
    }
  }
}

export function openPaymentDialog(
  dialog: MatDialog,
  data: PaymentDialogData,
): Promise<PaymentDto | undefined> {
  const ref = dialog.open<PaymentDialog, PaymentDialogData, PaymentDto>(PaymentDialog, {
    data,
    width: '520px',
    autoFocus: 'first-tabbable',
  });
  return firstValueFrom(ref.afterClosed());
}
