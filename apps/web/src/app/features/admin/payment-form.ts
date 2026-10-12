import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  resource,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SubscriptionPaymentMethod, type SubscriptionPaymentDto } from '@lavio/shared';
import { AdminApi } from '../../core/api/admin-api';
import { dateInputToIso, LICENSE_STATUS_LABELS, todayInput } from '../../shared/format/format';
import { errorMessage } from '../../shared/ui/toast/toast.service';
import { PAYMENT_METHOD_LABELS } from './labels';

/**
 * Enregistrement d'un paiement d'abonnement (docs/06) : prolonge la licence jusqu'à la fin
 * de la période et la passe en ACTIVE. Montants en FCFA entiers.
 */
@Component({
  selector: 'lv-payment-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <form class="lv-card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <h3 class="mb-1 text-lg">Enregistrer un paiement</h3>
      <p class="mb-4 text-sm text-ink-900/80">
        La licence sera prolongée jusqu’à la fin de la période et passera en « Active ».
      </p>
      <div class="lv-form-grid">
        @if (!tenantId()) {
          <mat-form-field>
            <mat-label>Pressing</mat-label>
            <mat-select formControlName="tenantId">
              @for (t of tenants.hasValue() ? tenants.value().data : []; track t.id) {
                <mat-option [value]="t.id">{{ t.name }}</mat-option>
              }
            </mat-select>
            <mat-error>Choisissez le pressing.</mat-error>
          </mat-form-field>
        }
        <mat-form-field>
          <mat-label>Licence</mat-label>
          <mat-select formControlName="licenseId">
            @for (l of licenses(); track l.id) {
              <mat-option [value]="l.id">{{ l.key }} · {{ statusLabel[l.status] }}</mat-option>
            }
          </mat-select>
          <mat-error>Choisissez la licence.</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Montant reçu (FCFA)</mat-label>
          <input
            matInput
            type="number"
            min="0"
            step="1"
            formControlName="amountXaf"
            inputmode="numeric"
          />
          <mat-error>Montant entier positif.</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Mode de paiement</mat-label>
          <mat-select formControlName="method">
            @for (m of methods; track m) {
              <mat-option [value]="m">{{ methodLabel[m] }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Référence</mat-label>
          <input matInput formControlName="reference" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Reçu le</mat-label>
          <input matInput type="date" formControlName="receivedAt" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Période du</mat-label>
          <input matInput type="date" formControlName="periodStart" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Au</mat-label>
          <input matInput type="date" formControlName="periodEnd" />
          <mat-error>Indiquez la fin de période.</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Déductions (FCFA)</mat-label>
          <input
            matInput
            type="number"
            min="0"
            step="1"
            formControlName="deductionsXaf"
            inputmode="numeric"
          />
          <mat-hint>Frais de transaction, commission de revendeur.</mat-hint>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Motif des déductions</mat-label>
          <input matInput formControlName="deductionNote" />
        </mat-form-field>
      </div>
      @if (error()) {
        <p class="lv-alert mt-2" role="alert">{{ error() }}</p>
      }
      <div class="mt-4 flex gap-2">
        <button mat-flat-button type="submit" [disabled]="pending()">
          Enregistrer le paiement
        </button>
        <button mat-button type="button" (click)="cancelled.emit()">Annuler</button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentForm {
  /** Pressing imposé (fiche du pressing) ; sinon, choix dans la liste. */
  readonly tenantId = input<string>();
  readonly recorded = output<SubscriptionPaymentDto>();
  readonly cancelled = output();
  private readonly api = inject(AdminApi);
  protected readonly methods = Object.values(SubscriptionPaymentMethod);
  protected readonly methodLabel = PAYMENT_METHOD_LABELS;
  protected readonly statusLabel = LICENSE_STATUS_LABELS;
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    tenantId: ['', Validators.required],
    licenseId: ['', Validators.required],
    amountXaf: [0, [Validators.required, Validators.min(0)]],
    method: inject(FormBuilder).nonNullable.control<SubscriptionPaymentMethod>('ORANGE_MONEY'),
    reference: [''],
    receivedAt: [todayInput()],
    periodStart: [todayInput()],
    periodEnd: [todayInput(30), Validators.required],
    deductionsXaf: [0, Validators.min(0)],
    deductionNote: [''],
  });

  private readonly selectedTenant = signal('');
  protected readonly tenants = resource({ loader: () => this.api.tenants({ pageSize: 100 }) });
  private readonly detail = resource({
    params: () => this.selectedTenant() || undefined,
    loader: ({ params }) => this.api.tenant(params),
  });
  protected readonly licenses = computed(() =>
    this.detail.hasValue()
      ? this.detail.value().licenses.filter((l) => l.status !== 'REVOKED')
      : [],
  );

  constructor() {
    effect(() => {
      const fixed = this.tenantId();
      if (fixed) {
        this.form.controls.tenantId.setValue(fixed);
        this.selectedTenant.set(fixed);
      }
    });
    this.form.controls.tenantId.valueChanges.subscribe((id) => {
      this.selectedTenant.set(id);
      this.form.controls.licenseId.setValue('');
    });
    effect(() => {
      const first = this.licenses().find((l) =>
        ['TRIAL', 'ACTIVE', 'GRACE', 'EXPIRED'].includes(l.status),
      );
      if (first && !this.form.controls.licenseId.value)
        this.form.controls.licenseId.setValue(first.id);
    });
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.pending.set(true);
    this.error.set(null);
    try {
      this.recorded.emit(
        await this.api.createPayment({
          tenantId: v.tenantId,
          licenseId: v.licenseId,
          amountXaf: Math.round(v.amountXaf),
          method: v.method,
          reference: v.reference || undefined,
          receivedAt: dateInputToIso(v.receivedAt),
          periodStart: dateInputToIso(v.periodStart),
          periodEnd: dateInputToIso(v.periodEnd),
          deductionsXaf: Math.round(v.deductionsXaf || 0),
          deductionNote: v.deductionNote || undefined,
        }),
      );
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.pending.set(false);
    }
  }
}
