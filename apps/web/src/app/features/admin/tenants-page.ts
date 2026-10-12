import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import type { TenantStatus } from '@lavio/shared';
import { AdminApi } from '../../core/api/admin-api';
import { AuthService } from '../../core/auth/auth.service';
import { FrDatePipe, PhonePipe } from '../../shared/format/format';
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
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
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
        <button mat-flat-button type="button" (click)="creating.set(true)">Nouveau pressing</button>
      }
    </lv-page-header>

    @if (creating()) {
      <form class="lv-card mb-6" [formGroup]="form" (ngSubmit)="create()" novalidate>
        <h2 class="mb-4 text-xl">Nouveau pressing</h2>
        <div class="lv-form-grid">
          <mat-form-field
            ><mat-label>Nom du pressing</mat-label
            ><input matInput formControlName="name" /><mat-error
              >Indiquez le nom.</mat-error
            ></mat-form-field
          >
          <mat-form-field
            ><mat-label>Téléphone</mat-label
            ><input matInput formControlName="phone" inputmode="tel"
          /></mat-form-field>
          <mat-form-field
            ><mat-label>Ville</mat-label><input matInput formControlName="city"
          /></mat-form-field>
          <mat-form-field
            ><mat-label>Adresse</mat-label><input matInput formControlName="address"
          /></mat-form-field>
          <mat-form-field
            ><mat-label>NIU (facultatif)</mat-label><input matInput formControlName="niu"
          /></mat-form-field>
          <mat-form-field
            ><mat-label>RCCM (facultatif)</mat-label><input matInput formControlName="rccm"
          /></mat-form-field>
        </div>
        @if (error()) {
          <p class="lv-alert mt-2" role="alert">{{ error() }}</p>
        }
        <div class="mt-4 flex gap-2">
          <button mat-flat-button type="submit" [disabled]="pending()">Créer le pressing</button>
          <button mat-button type="button" (click)="creating.set(false)">Annuler</button>
        </div>
      </form>
    }

    <div class="mb-4 flex flex-wrap gap-4">
      <mat-form-field class="min-w-64">
        <mat-label>Rechercher (nom, ville, téléphone)</mat-label>
        <input matInput type="search" [ngModel]="q()" (ngModelChange)="search($event)" />
      </mat-form-field>
      <mat-form-field>
        <mat-label>Statut</mat-label>
        <mat-select [ngModel]="status()" (ngModelChange)="status.set($event); page.set(1)">
          <mat-option [value]="''">Tous</mat-option>
          @for (s of statuses; track s) {
            <mat-option [value]="s">{{ statusLabel[s] }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
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
