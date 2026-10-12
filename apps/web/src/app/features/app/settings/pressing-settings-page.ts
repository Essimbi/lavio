import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PressingApi } from '../../../core/api/pressing-api';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { errorMessage, Toast } from '../../../shared/ui/toast/toast.service';
import { compressImage, uploadToBlob } from '../../../shared/upload/photo-upload';

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/** Paramètres du pressing (module 12) : identité, ticket, TVA, tournées, seuils. */
@Component({
  selector: 'lv-pressing-settings-page',
  imports: [ReactiveFormsModule, PageHeader],
  template: `
    <lv-page-header
      heading="Paramètres du pressing"
      subtitle="Ces informations figurent sur les tickets et règlent les contrôles automatiques."
    />
    <form class="grid max-w-4xl gap-6" [formGroup]="form" (ngSubmit)="save()" novalidate>
      <section class="lv-card">
        <h2 class="mb-3 text-xl">Identité</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="lv-label" for="ps-name">Nom du pressing</label
            ><input id="ps-name" class="lv-input" formControlName="name" />
          </div>
          <div>
            <label class="lv-label" for="ps-phone">Téléphone</label
            ><input id="ps-phone" class="lv-input" inputmode="tel" formControlName="phone" />
          </div>
          <div>
            <label class="lv-label" for="ps-address">Adresse</label
            ><input id="ps-address" class="lv-input" formControlName="address" />
          </div>
          <div>
            <label class="lv-label" for="ps-city">Ville</label
            ><input id="ps-city" class="lv-input" formControlName="city" />
          </div>
          <div>
            <label class="lv-label" for="ps-niu">NIU</label
            ><input id="ps-niu" class="lv-input" formControlName="niu" />
          </div>
          <div>
            <label class="lv-label" for="ps-rccm">RCCM</label
            ><input id="ps-rccm" class="lv-input" formControlName="rccm" />
          </div>
        </div>
        <div class="mt-4 flex flex-wrap items-center gap-4">
          @if (logoUrl()) {
            <img
              class="h-14 w-auto rounded-field bg-white p-1"
              [src]="logoUrl()"
              alt="Logo du pressing"
            />
          }
          <label class="lv-secondary cursor-pointer">
            {{ uploading() ? 'Envoi…' : 'Choisir un logo' }}
            <input
              class="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              (change)="uploadLogo($event)"
              [disabled]="uploading()"
            />
          </label>
        </div>
      </section>

      <section class="lv-card">
        <h2 class="mb-3 text-xl">Ticket et TVA</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="lv-label" for="ps-prefix">Préfixe du numéro de ticket</label
            ><input
              id="ps-prefix"
              class="lv-input"
              formControlName="ticketPrefix"
              placeholder="Aucun"
            />
          </div>
          <div>
            <label class="lv-label" for="ps-footer">Pied de ticket</label
            ><input id="ps-footer" class="lv-input" formControlName="ticketFooter" />
          </div>
          <label class="inline-flex min-h-11 items-center gap-2"
            ><input type="checkbox" formControlName="vatEnabled" /> Assujetti à la TVA</label
          >
          <div>
            <label class="lv-label" for="ps-vat">Taux de TVA (%)</label
            ><input
              id="ps-vat"
              class="lv-input"
              type="number"
              min="0"
              max="100"
              step="0.01"
              formControlName="vatRate"
            />
          </div>
        </div>
      </section>

      <section class="lv-card">
        <h2 class="mb-1 text-xl">Tournées</h2>
        <p class="mb-3 text-sm">
          Jours de ramassage et de livraison ; ils fixent aussi la date de retrait proposée.
        </p>
        <div class="flex flex-wrap gap-x-5 gap-y-2">
          @for (day of days; track $index) {
            <label class="inline-flex min-h-8 items-center gap-2"
              ><input
                type="checkbox"
                [checked]="tourDays().includes($index)"
                (change)="toggleDay($index, $any($event.target).checked)"
              />
              {{ day }}</label
            >
          }
        </div>
      </section>

      <section class="lv-card" formGroupName="settings">
        <h2 class="mb-3 text-xl">Seuils et règles</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="lv-label" for="ps-discount">Remise à valider au-delà de (%)</label
            ><input
              id="ps-discount"
              class="lv-input"
              type="number"
              min="0"
              max="100"
              formControlName="discountApprovalPercent"
            />
          </div>
          <div>
            <label class="lv-label" for="ps-express">Majoration express (%)</label
            ><input
              id="ps-express"
              class="lv-input"
              type="number"
              min="0"
              formControlName="expressSurchargePercent"
            />
          </div>
          <div>
            <label class="lv-label" for="ps-advance"
              >Acompte exigé au-delà de (FCFA, vide : jamais)</label
            ><input
              id="ps-advance"
              class="lv-input"
              type="number"
              min="0"
              formControlName="advanceRequiredAbove"
            />
          </div>
          <div>
            <label class="lv-label" for="ps-advance-pct">Acompte minimal (%)</label
            ><input
              id="ps-advance-pct"
              class="lv-input"
              type="number"
              min="0"
              max="100"
              formControlName="advanceMinPercent"
            />
          </div>
          <div>
            <label class="lv-label" for="ps-days">Délai de traitement (jours)</label
            ><input
              id="ps-days"
              class="lv-input"
              type="number"
              min="0"
              formControlName="processingDays"
            />
          </div>
          <div>
            <label class="lv-label" for="ps-late">Alerte « non retiré » après (jours)</label
            ><input
              id="ps-late"
              class="lv-input"
              type="number"
              min="1"
              formControlName="lateAfterDays"
            />
          </div>
          <div>
            <label class="lv-label" for="ps-expense"
              >Dépense à valider au-delà de (FCFA, vide : jamais)</label
            ><input
              id="ps-expense"
              class="lv-input"
              type="number"
              min="0"
              formControlName="largeExpenseAbove"
            />
          </div>
          <div>
            <label class="lv-label" for="ps-unpaid"
              >Alerte impayé au-delà de (FCFA, vide : jamais)</label
            ><input
              id="ps-unpaid"
              class="lv-input"
              type="number"
              min="0"
              formControlName="unpaidAlertAbove"
            />
          </div>
        </div>
      </section>

      @if (error()) {
        <p class="lv-alert" role="alert">{{ error() }}</p>
      }
      <div><button type="submit" class="lv-primary">Enregistrer les paramètres</button></div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PressingSettingsPage {
  private readonly api = inject(PressingApi);
  private readonly toast = inject(Toast);
  protected readonly days = DAYS;
  protected readonly settings = resource({ loader: () => this.api.settings() });
  protected readonly tourDays = signal<number[]>([]);
  protected readonly logoUrl = signal<string | null>(null);
  protected readonly uploading = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly fb = inject(FormBuilder);
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
    address: [''],
    city: [''],
    niu: [''],
    rccm: [''],
    ticketPrefix: ['', Validators.pattern(/^[A-Za-z0-9-]{0,6}$/)],
    ticketFooter: [''],
    vatEnabled: [false],
    vatRate: this.fb.control<number | null>(null),
    settings: this.fb.nonNullable.group({
      discountApprovalPercent: [10],
      expressSurchargePercent: [0],
      advanceRequiredAbove: this.fb.control<number | null>(null),
      advanceMinPercent: [50],
      processingDays: [2],
      lateAfterDays: [30],
      largeExpenseAbove: this.fb.control<number | null>(null),
      unpaidAlertAbove: this.fb.control<number | null>(null),
    }),
  });

  constructor() {
    effect(() => {
      if (!this.settings.hasValue()) return;
      const s = this.settings.value();
      this.form.reset({
        name: s.name,
        phone: s.phone ?? '',
        address: s.address ?? '',
        city: s.city ?? '',
        niu: s.niu ?? '',
        rccm: s.rccm ?? '',
        ticketPrefix: s.ticketPrefix ?? '',
        ticketFooter: s.ticketFooter ?? '',
        vatEnabled: s.vatEnabled,
        vatRate: s.vatRate,
        settings: s.settings,
      });
      this.tourDays.set(s.tourDays);
      this.logoUrl.set(s.logoUrl);
    });
  }

  protected toggleDay(day: number, on: boolean): void {
    this.tourDays.update((d) =>
      on ? [...new Set([...d, day])].sort() : d.filter((x) => x !== day),
    );
  }

  protected async uploadLogo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.uploading.set(true);
    try {
      const url = await uploadToBlob(
        await this.api.logoUploadToken(),
        await compressImage(file, 600, 0.9),
      );
      const saved = await this.api.updateSettings({ logoUrl: url });
      this.logoUrl.set(saved.logoUrl);
      this.toast.success('Logo enregistré.');
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.uploading.set(false);
    }
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Vérifiez le nom et le préfixe (6 caractères au plus).');
      return;
    }
    const v = this.form.getRawValue();
    const nullable = (n: number | null) =>
      n === null || (n as unknown) === '' ? null : Math.floor(n);
    this.error.set(null);
    try {
      await this.api.updateSettings({
        name: v.name,
        phone: v.phone || undefined,
        address: v.address,
        city: v.city,
        niu: v.niu,
        rccm: v.rccm,
        ticketPrefix: v.ticketPrefix.toUpperCase(),
        ticketFooter: v.ticketFooter,
        vatEnabled: v.vatEnabled,
        vatRate: v.vatRate,
        tourDays: this.tourDays(),
        settings: {
          ...v.settings,
          advanceRequiredAbove: nullable(v.settings.advanceRequiredAbove),
          largeExpenseAbove: nullable(v.settings.largeExpenseAbove),
          unpaidAlertAbove: nullable(v.settings.unpaidAlertAbove),
        },
      });
      this.toast.success('Paramètres enregistrés.');
      this.settings.reload();
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }
}
