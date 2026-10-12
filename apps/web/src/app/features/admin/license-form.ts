import {
  ChangeDetectionStrategy,
  Component,
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
import type { LicenseDto } from '@lavio/shared';
import { AdminApi } from '../../core/api/admin-api';
import { dateInputToIso, todayInput } from '../../shared/format/format';
import { errorMessage } from '../../shared/ui/toast/toast.service';

/** Création d'une licence (docs/06, étape 3) : plan, essai ou active, période. */
@Component({
  selector: 'lv-license-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <form class="lv-card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <h3 class="mb-4 text-lg">Nouvelle licence</h3>
      <div class="lv-form-grid">
        <mat-form-field>
          <mat-label>Plan</mat-label>
          <mat-select formControlName="planId">
            @for (p of plans.hasValue() ? plans.value() : []; track p.id) {
              @if (p.isActive) {
                <mat-option [value]="p.id"
                  >{{ p.name }} ({{ p.includedUsers }} utilisateurs)</mat-option
                >
              }
            }
          </mat-select>
          <mat-error>Choisissez un plan.</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Type</mat-label>
          <mat-select formControlName="status">
            <mat-option value="TRIAL">Essai gratuit</mat-option>
            <mat-option value="ACTIVE">Active (payée)</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Début</mat-label>
          <input matInput type="date" formControlName="startsAt" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Fin</mat-label>
          <input matInput type="date" formControlName="endsAt" />
          <mat-hint>{{
            form.controls.status.value === 'TRIAL'
              ? 'Vide : durée d’essai du plan.'
              : 'Obligatoire.'
          }}</mat-hint>
        </mat-form-field>
      </div>
      @if (error()) {
        <p class="lv-alert mt-2" role="alert">{{ error() }}</p>
      }
      <div class="mt-4 flex gap-2">
        <button mat-flat-button type="submit" [disabled]="pending()">Créer la licence</button>
        <button mat-button type="button" (click)="cancelled.emit()">Annuler</button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LicenseForm {
  readonly tenantId = input.required<string>();
  readonly created = output<LicenseDto>();
  readonly cancelled = output();
  private readonly api = inject(AdminApi);
  protected readonly plans = resource({ loader: () => this.api.plans() });
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    planId: ['', Validators.required],
    status: inject(FormBuilder).nonNullable.control<'TRIAL' | 'ACTIVE'>('TRIAL'),
    startsAt: [todayInput()],
    endsAt: [''],
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    if (v.status === 'ACTIVE' && !v.endsAt) {
      this.error.set('Indiquez la date de fin d’une licence active.');
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    try {
      this.created.emit(
        await this.api.createLicense({
          tenantId: this.tenantId(),
          planId: v.planId,
          status: v.status,
          startsAt: v.startsAt ? dateInputToIso(v.startsAt) : undefined,
          endsAt: v.endsAt ? dateInputToIso(v.endsAt) : undefined,
        }),
      );
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.pending.set(false);
    }
  }
}
