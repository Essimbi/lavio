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
import { errorMessage } from '../../../shared/ui/toast/toast.service';

/** Fiche client (docs/01, module 1) : création ou modification. */
@Component({
  selector: 'lv-customer-form',
  imports: [ReactiveFormsModule],
  template: `
    <form class="lv-card" [formGroup]="form" (ngSubmit)="save()" novalidate>
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="lv-label" for="cf-name">Nom</label>
          <input
            id="cf-name"
            class="lv-input"
            formControlName="name"
            [attr.aria-invalid]="form.controls.name.invalid && form.controls.name.touched"
          />
        </div>
        <div>
          <label class="lv-label" for="cf-type">Type</label>
          <select id="cf-type" class="lv-select" formControlName="type">
            <option value="INDIVIDUAL">Particulier</option>
            <option value="COMPANY">Entreprise</option>
          </select>
        </div>
        <div>
          <label class="lv-label" for="cf-phone">Téléphone</label>
          <input
            id="cf-phone"
            class="lv-input"
            inputmode="tel"
            formControlName="phone"
            placeholder="+237 6XX XX XX XX"
            [attr.aria-invalid]="form.controls.phone.invalid && form.controls.phone.touched"
          />
        </div>
        <div>
          <label class="lv-label" for="cf-phone2">Second téléphone</label>
          <input id="cf-phone2" class="lv-input" inputmode="tel" formControlName="phone2" />
        </div>
        <div class="sm:col-span-2">
          <label class="lv-label" for="cf-address">Adresse</label>
          <input id="cf-address" class="lv-input" formControlName="address" />
        </div>
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
        <div>
          <label class="lv-label" for="cf-limit">Plafond de crédit (FCFA)</label>
          <input
            id="cf-limit"
            class="lv-input tabular"
            type="number"
            min="0"
            formControlName="creditLimitXaf"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="lv-label" for="cf-notes">Remarques</label>
          <textarea id="cf-notes" class="lv-input" rows="2" formControlName="notes"></textarea>
        </div>
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
