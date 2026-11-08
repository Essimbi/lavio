import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { CustomerDto, CustomerType } from '@lavio/shared';
import { type CustomerInput, PressingApi } from '../../../core/api/pressing-api';
import { LV_FIELD } from '../../../shared/ui/field/field';
import { errorMessage } from '../../../shared/ui/toast/toast.service';

/** Fiche client (docs/01, module 1) : création ou modification. */
@Component({
  selector: 'lv-customer-form',
  imports: [ReactiveFormsModule, LV_FIELD],
  template: `
    <form class="lv-card" [formGroup]="form" (ngSubmit)="save()" novalidate>
      <div class="grid gap-3 sm:grid-cols-2">
        <lv-field
          label="Nom"
          [errors]="{ required: 'Indiquez le nom.', minlength: 'Au moins 2 caractères.' }"
        >
          <input lvControl formControlName="name" />
        </lv-field>
        <lv-field label="Type">
          <select lvControl formControlName="type">
            <option value="INDIVIDUAL">Particulier</option>
            <option value="COMPANY">Entreprise</option>
          </select>
        </lv-field>
        <lv-field
          label="Téléphone"
          [errors]="{
            required: 'Indiquez le téléphone.',
            pattern: 'Numéro de téléphone invalide.',
          }"
        >
          <input
            lvControl
            inputmode="tel"
            formControlName="phone"
            placeholder="+237 6XX XX XX XX"
          />
        </lv-field>
        <lv-field label="Second téléphone">
          <input lvControl inputmode="tel" formControlName="phone2" />
        </lv-field>
        <lv-field label="Adresse" class="sm:col-span-2">
          <input lvControl formControlName="address" />
        </lv-field>
      </div>
      <fieldset class="mt-3">
        <legend class="lv-label">Préférences</legend>
        <label class="mr-5 inline-flex min-h-8 items-center gap-2"
          ><input type="checkbox" formControlName="noCover" /> Sans housse</label
        >
        <label class="inline-flex min-h-8 items-center gap-2"
          ><input type="checkbox" formControlName="returnHangers" /> Reprend ses cintres</label
        >
      </fieldset>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <label class="inline-flex min-h-11 items-center gap-2"
          ><input type="checkbox" formControlName="creditAllowed" /> Crédit autorisé</label
        >
        <lv-field
          label="Plafond de crédit (FCFA)"
          [errors]="{ min: 'Le plafond ne peut pas être négatif.' }"
        >
          <input lvControl class="tabular" type="number" min="0" formControlName="creditLimitXaf" />
        </lv-field>
        <lv-field label="Remarques" class="sm:col-span-2">
          <textarea lvControl rows="2" formControlName="notes"></textarea>
        </lv-field>
      </div>
      @if (error()) {
        <p class="lv-alert mt-3" role="alert">{{ error() }}</p>
      }
      <div class="mt-4 flex gap-2">
        <button type="submit" class="lv-primary" [disabled]="pending()">Enregistrer</button>
        <button type="button" class="lv-link-button" (click)="cancelled.emit()">Annuler</button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerForm {
  readonly customer = input<CustomerDto | null>(null);
  readonly saved = output<CustomerDto>();
  readonly cancelled = output();
  private readonly api = inject(PressingApi);
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    type: inject(FormBuilder).nonNullable.control<CustomerType>('INDIVIDUAL'),
    phone: ['', [Validators.required, Validators.pattern(/^\+?[\d\s.-]{8,20}$/)]],
    phone2: [''],
    address: [''],
    noCover: [false],
    returnHangers: [false],
    creditAllowed: [false],
    creditLimitXaf: inject(FormBuilder).control<number | null>(null),
    notes: [''],
  });

  constructor() {
    effect(() => {
      const c = this.customer();
      if (c) {
        this.form.reset({
          name: c.name,
          type: c.type,
          phone: c.phone,
          phone2: c.phone2 ?? '',
          address: c.address ?? '',
          noCover: !!c.preferences.noCover,
          returnHangers: !!c.preferences.returnHangers,
          creditAllowed: c.creditAllowed,
          creditLimitXaf: c.creditLimitXaf,
          notes: c.notes ?? '',
        });
      }
    });
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Indiquez au moins le nom et un téléphone valide.');
      return;
    }
    const v = this.form.getRawValue();
    const body: CustomerInput = {
      name: v.name,
      type: v.type,
      phone: v.phone,
      phone2: v.phone2 || null,
      address: v.address || undefined,
      preferences: { noCover: v.noCover, returnHangers: v.returnHangers },
      notes: v.notes || undefined,
      creditAllowed: v.creditAllowed,
      creditLimitXaf: v.creditLimitXaf ?? null,
    };
    this.pending.set(true);
    this.error.set(null);
    try {
      const c = this.customer();
      this.saved.emit(
        c
          ? await this.api.updateCustomer(c.id, body)
          : await this.api.createCustomer({ ...body, phone2: body.phone2 ?? undefined }),
      );
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.pending.set(false);
    }
  }
}
