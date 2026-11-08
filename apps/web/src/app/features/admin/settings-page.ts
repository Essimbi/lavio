import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApi } from '../../core/api/admin-api';
import { LV_FIELD } from '../../shared/ui/field/field';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { errorMessage, Toast } from '../../shared/ui/toast/toast.service';

/** Paramètres de la plateforme : numéro WhatsApp, taux de partage, essai, grâce, messages types. */
@Component({
  selector: 'lv-admin-settings-page',
  imports: [ReactiveFormsModule, LV_FIELD, PageHeader],
  template: `
    <lv-page-header
      heading="Paramètres"
      subtitle="Valeurs utilisées par la landing, l’application et le superadmin."
    />
    <form class="lv-card max-w-3xl" [formGroup]="form" (ngSubmit)="save()" novalidate>
      <h2 class="mb-4 text-xl">Service client et abonnements</h2>
      <div class="lv-form-grid">
        <lv-field
          label="Numéro WhatsApp du service client"
          hint="Chiffres seuls, indicatif compris (ex. 237…)."
          [optional]="true"
          [errors]="{ pattern: 'Chiffres uniquement (8 à 15).' }"
        >
          <input lvControl formControlName="whatsappNumber" inputmode="numeric" />
        </lv-field>
        <lv-field
          label="Taux de partage du Concepteur (%)"
          [errors]="{
            required: 'Indiquez le taux de partage.',
            min: 'Entre 0 et 100.',
            max: 'Entre 0 et 100.',
          }"
        >
          <input lvControl type="number" min="0" max="100" formControlName="shareRatePercent" />
        </lv-field>
        <lv-field
          label="Essai gratuit par défaut (jours)"
          [errors]="{ required: 'Indiquez une durée.', min: '0 ou plus.' }"
        >
          <input lvControl type="number" min="0" formControlName="defaultTrialDays" />
        </lv-field>
        <lv-field
          label="Période de grâce par défaut (jours)"
          [errors]="{ required: 'Indiquez une durée.', min: '0 ou plus.' }"
        >
          <input lvControl type="number" min="0" formControlName="defaultGraceDays" />
        </lv-field>
      </div>
      <h2 class="mb-2 mt-6 text-xl">Messages WhatsApp types</h2>
      <p class="mb-4 text-sm text-ink-900/80">Variables disponibles : {{ variables }}.</p>
      <div class="grid gap-4">
        <lv-field
          label="Message de la landing"
          [errors]="{ required: 'Indiquez le message de la landing.' }"
        >
          <textarea lvControl rows="2" formControlName="whatsappDefaultMessage"></textarea>
        </lv-field>
        <lv-field label="Invitation" [errors]="{ required: 'Indiquez le message d’invitation.' }">
          <textarea lvControl rows="3" formControlName="whatsappInvitationMessage"></textarea>
        </lv-field>
        <lv-field
          label="Renouvellement de licence"
          [errors]="{ required: 'Indiquez le message de renouvellement.' }"
        >
          <textarea lvControl rows="2" formControlName="whatsappRenewalMessage"></textarea>
        </lv-field>
        <lv-field
          label="Utilisateurs supplémentaires"
          [errors]="{ required: 'Indiquez le message pour les utilisateurs supplémentaires.' }"
        >
          <textarea lvControl rows="2" formControlName="whatsappExtraUsersMessage"></textarea>
        </lv-field>
      </div>
      @if (error()) {
        <p class="lv-alert mt-4" role="alert">{{ error() }}</p>
      }
      <button class="lv-primary mt-4" type="submit" [disabled]="form.pristine">
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
