import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AdminApi } from '../../core/api/admin-api';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { errorMessage, Toast } from '../../shared/ui/toast/toast.service';

/** Paramètres de la plateforme : numéro WhatsApp, taux de partage, essai, grâce, messages types. */
@Component({
  selector: 'lv-admin-settings-page',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, PageHeader],
  template: `
    <lv-page-header
      heading="Paramètres"
      subtitle="Valeurs utilisées par la landing, l’application et le superadmin."
    />
    <form class="lv-card max-w-3xl" [formGroup]="form" (ngSubmit)="save()" novalidate>
      <h2 class="mb-4 text-xl">Service client et abonnements</h2>
      <div class="lv-form-grid">
        <mat-form-field>
          <mat-label>Numéro WhatsApp du service client</mat-label>
          <input matInput formControlName="whatsappNumber" inputmode="numeric" />
          <mat-hint>Chiffres seuls, indicatif compris (ex. 237…).</mat-hint>
          <mat-error>Chiffres uniquement (8 à 15).</mat-error>
        </mat-form-field>
        <mat-form-field
          ><mat-label>Taux de partage du Concepteur (%)</mat-label
          ><input matInput type="number" min="0" max="100" formControlName="shareRatePercent"
        /></mat-form-field>
        <mat-form-field
          ><mat-label>Essai gratuit par défaut (jours)</mat-label
          ><input matInput type="number" min="0" formControlName="defaultTrialDays"
        /></mat-form-field>
        <mat-form-field
          ><mat-label>Période de grâce par défaut (jours)</mat-label
          ><input matInput type="number" min="0" formControlName="defaultGraceDays"
        /></mat-form-field>
      </div>
      <h2 class="mb-2 mt-4 text-xl">Messages WhatsApp types</h2>
      <p class="mb-4 text-sm text-ink-900/80">Variables disponibles : {{ variables }}.</p>
      <mat-form-field class="w-full"
        ><mat-label>Message de la landing</mat-label
        ><textarea matInput rows="2" formControlName="whatsappDefaultMessage"></textarea>
      </mat-form-field>
      <mat-form-field class="w-full"
        ><mat-label>Invitation</mat-label
        ><textarea matInput rows="3" formControlName="whatsappInvitationMessage"></textarea>
      </mat-form-field>
      <mat-form-field class="w-full"
        ><mat-label>Renouvellement de licence</mat-label
        ><textarea matInput rows="2" formControlName="whatsappRenewalMessage"></textarea>
      </mat-form-field>
      <mat-form-field class="w-full"
        ><mat-label>Utilisateurs supplémentaires</mat-label
        ><textarea matInput rows="2" formControlName="whatsappExtraUsersMessage"></textarea>
      </mat-form-field>
      @if (error()) {
        <p class="lv-alert mb-4" role="alert">{{ error() }}</p>
      }
      <button mat-flat-button type="submit" [disabled]="form.pristine">
        Enregistrer les paramètres
      </button>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSettingsPage {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(Toast);
  protected readonly variables = '{nom}, {pressing}, {lien}, {cle}';
  protected readonly settings = resource({ loader: () => this.api.settings() });
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    whatsappNumber: ['', Validators.pattern(/^\d{8,15}$/)],
    shareRatePercent: [50, [Validators.required, Validators.min(0), Validators.max(100)]],
    defaultTrialDays: [14, [Validators.required, Validators.min(0)]],
    defaultGraceDays: [7, [Validators.required, Validators.min(0)]],
    whatsappDefaultMessage: ['', Validators.required],
    whatsappInvitationMessage: ['', Validators.required],
    whatsappRenewalMessage: ['', Validators.required],
    whatsappExtraUsersMessage: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      if (this.settings.hasValue()) this.form.reset(this.settings.value());
    });
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.error.set(null);
    try {
      const saved = await this.api.updateSettings({
        ...v,
        whatsappNumber: v.whatsappNumber || undefined,
      });
      this.form.reset(saved);
      this.toast.success('Paramètres enregistrés.');
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }
}
