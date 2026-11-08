import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { TenantStatus } from '@lavio/shared';
import { AdminApi } from '../../core/api/admin-api';
import { AuthService } from '../../core/auth/auth.service';
import { FrDatePipe, PhonePipe } from '../../shared/format/format';
import { LV_FIELD } from '../../shared/ui/field/field';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Pager } from '../../shared/ui/pager/pager';
import { Chip, LicenseChip } from '../../shared/ui/status-chip/status-chip';
import { errorMessage } from '../../shared/ui/toast/toast.service';
import { TENANT_STATUS_LABELS } from './labels';

/** Liste des pressings (recherche, filtre par statut) et création (docs/06). */
@Component({
  selector: 'lv-tenants-page',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    LV_FIELD,
    RouterLink,
    PageHeader,
    Pager,
    Chip,
    LicenseChip,
    FrDatePipe,
    PhonePipe,
  ],
  template: `
    <lv-page-header heading="Pressings" subtitle="Les clients de Lavio.">
      @if (auth.hasPlatformRole('SUPER_ADMIN') && !creating()) {
        <button class="lv-primary" type="button" (click)="creating.set(true)">
          Nouveau pressing
        </button>
      }
    </lv-page-header>

    @if (creating()) {
      <form class="lv-card mb-6" [formGroup]="form" (ngSubmit)="create()" novalidate>
        <h2 class="mb-4 text-xl">Nouveau pressing</h2>
        <div class="lv-form-grid gap-y-4">
          <lv-field
            label="Nom du pressing"
            [errors]="{
              required: 'Indiquez le nom du pressing.',
              minlength: 'Au moins 2 caractères.',
            }"
          >
            <input lvControl formControlName="name" autocomplete="organization" />
          </lv-field>
          <lv-field
            label="Téléphone"
            [optional]="true"
            [errors]="{ pattern: 'Numéro invalide (ex. 6 90 00 00 00).' }"
          >
            <input lvControl formControlName="phone" inputmode="tel" autocomplete="tel" />
          </lv-field>
          <lv-field label="Ville" [optional]="true">
            <input lvControl formControlName="city" autocomplete="address-level2" />
          </lv-field>
          <lv-field label="Adresse" [optional]="true">
            <input lvControl formControlName="address" autocomplete="street-address" />
          </lv-field>
          <lv-field label="NIU" [optional]="true" hint="Affiché sur les factures.">
            <input lvControl formControlName="niu" />
          </lv-field>
          <lv-field label="RCCM" [optional]="true" hint="Affiché sur les factures.">
            <input lvControl formControlName="rccm" />
          </lv-field>
        </div>
        @if (error()) {
          <p class="lv-alert mt-2" role="alert">{{ error() }}</p>
        }
        <div class="mt-4 flex gap-2">
          <button class="lv-primary" type="submit" [disabled]="pending()">
            {{ pending() ? 'Création…' : 'Créer le pressing' }}
          </button>
          <button class="lv-ghost" type="button" (click)="creating.set(false)">Annuler</button>
        </div>
      </form>
    }

    <div class="lv-toolbar" role="search">
      <lv-field label="Rechercher" class="lv-grow">
        <input
          lvControl
          class="lv-search"
          type="search"
          placeholder="Nom, ville ou téléphone"
          [ngModel]="q()"
          (ngModelChange)="search($event)"
        />
      </lv-field>
      <lv-field label="Statut">
        <select lvControl [ngModel]="status()" (ngModelChange)="status.set($event); page.set(1)">
          <option value="">Tous</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ statusLabel[s] }}</option>
          }
        </select>
      </lv-field>
    </div>

    <div class="lv-table-wrap">
      <table class="lv-table">
        <caption class="sr-only">
          Pressings
        </caption>
        <thead>
          <tr>
            <th scope="col">Pressing</th>
            <th scope="col">Ville</th>
            <th scope="col">Téléphone</th>
            <th scope="col">Statut</th>
            <th scope="col">Licence</th>
            <th scope="col">Fin</th>
          </tr>
        </thead>
        <tbody>
          @for (t of list.hasValue() ? list.value().data : []; track t.id) {
            <tr>
              <td>
                <a [routerLink]="['/admin/tenants', t.id]" class="font-semibold">{{ t.name }}</a>
              </td>
              <td>{{ t.city ?? '—' }}</td>
              <td>{{ t.phone | phone }}</td>
              <td>
                <lv-chip
                  [tone]="
                    t.status === 'ACTIVE'
                      ? 'bg-mint-100 text-teal-900'
                      : 'bg-coral-600 text-white font-bold'
                  "
                  >{{ statusLabel[t.status] }}</lv-chip
                >
              </td>
              <td>
                @if (t.license) {
                  <lv-license-chip [status]="t.license.status" />
                } @else {
                  Aucune
                }
              </td>
              <td>{{ t.license?.endsAt | frDate }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="6">{{ list.isLoading() ? 'Chargement…' : 'Aucun pressing.' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <lv-pager [meta]="list.hasValue() ? list.value().meta : null" (page)="page.set($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantsPage {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly statuses: TenantStatus[] = ['ACTIVE', 'SUSPENDED', 'CLOSED'];
  protected readonly statusLabel = TENANT_STATUS_LABELS;

  protected readonly q = signal('');
  protected readonly status = signal<TenantStatus | ''>('');
  protected readonly page = signal(1);
  protected readonly list = resource({
    params: () => ({ q: this.q(), status: this.status(), page: this.page() }),
    loader: ({ params }) => this.api.tenants(params),
  });

  protected readonly creating = signal(false);
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
    city: [''],
    address: [''],
    niu: [''],
    rccm: [''],
  });

  protected search(value: string): void {
    this.q.set(value);
    this.page.set(1);
  }

  protected async create(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    try {
      const tenant = await this.api.createTenant(this.form.getRawValue());
      await this.router.navigate(['/admin/tenants', tenant.id]);
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.pending.set(false);
    }
  }
}
