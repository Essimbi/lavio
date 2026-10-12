import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { PlanDto } from '@lavio/shared';
import { AdminApi } from '../../core/api/admin-api';
import { AuthService } from '../../core/auth/auth.service';
import { XafPipe } from '../../shared/format/format';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Chip } from '../../shared/ui/status-chip/status-chip';
import { errorMessage, Toast } from '../../shared/ui/toast/toast.service';

/** Drapeaux de fonctionnalités (docs/06) : un seul plan avec tout activé en V1. */
const FEATURES = [
  { key: 'stock', label: 'Stock' },
  { key: 'accounting', label: 'Comptabilité de gestion' },
  { key: 'tours', label: 'Tournées' },
  { key: 'push', label: 'Notifications push' },
] as const;

const amount = (v: string): number | null => (v.trim() === '' ? null : Math.round(Number(v)));

/** Plans d'abonnement : prix lus ici, jamais écrits en dur (docs/06, docs/14). */
@Component({
  selector: 'lv-plans-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    PageHeader,
    Chip,
    XafPipe,
  ],
  template: `
    <lv-page-header heading="Plans" subtitle="Offres d’abonnement proposées aux pressings.">
      @if (admin && !editing()) {
        <button mat-flat-button type="button" (click)="edit(null)">Nouveau plan</button>
      }
    </lv-page-header>

    @if (editing()) {
      <form class="lv-card mb-6" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <h2 class="mb-4 text-xl">{{ editId() ? 'Modifier le plan' : 'Nouveau plan' }}</h2>
        <div class="lv-form-grid">
          <mat-form-field
            ><mat-label>Code</mat-label
            ><input matInput formControlName="code" [readonly]="!!editId()" /><mat-hint
              >Ex. STANDARD</mat-hint
            ></mat-form-field
          >
          <mat-form-field
            ><mat-label>Nom</mat-label><input matInput formControlName="name"
          /></mat-form-field>
          <mat-form-field
            ><mat-label>Prix mensuel (FCFA)</mat-label
            ><input matInput formControlName="priceMonthlyXaf" inputmode="numeric" /><mat-hint
              >Vide : tarif sur demande.</mat-hint
            ></mat-form-field
          >
          <mat-form-field
            ><mat-label>Prix annuel (FCFA)</mat-label
            ><input matInput formControlName="priceYearlyXaf" inputmode="numeric"
          /></mat-form-field>
          <mat-form-field
            ><mat-label>Utilisateurs inclus</mat-label
            ><input matInput type="number" min="1" formControlName="includedUsers"
          /></mat-form-field>
          <mat-form-field
            ><mat-label>Prix par utilisateur supplémentaire (FCFA)</mat-label
            ><input matInput formControlName="extraUserPriceXaf" inputmode="numeric"
          /></mat-form-field>
          <mat-form-field
            ><mat-label>Durée d’essai (jours)</mat-label
            ><input matInput type="number" min="0" formControlName="trialDays"
          /></mat-form-field>
        </div>
        <fieldset class="mt-2">
          <legend class="mb-2 font-semibold">Fonctionnalités</legend>
          <div class="flex flex-wrap gap-x-6" formGroupName="features">
            @for (f of features; track f.key) {
              <mat-checkbox [formControlName]="f.key">{{ f.label }}</mat-checkbox>
            }
          </div>
        </fieldset>
        <mat-checkbox class="mt-2" formControlName="isActive"
          >Plan proposé aux nouveaux pressings</mat-checkbox
        >
        @if (error()) {
          <p class="lv-alert mt-2" role="alert">{{ error() }}</p>
        }
        <div class="mt-4 flex gap-2">
          <button mat-flat-button type="submit">Enregistrer</button>
          <button mat-button type="button" (click)="editing.set(false)">Annuler</button>
        </div>
      </form>
    }

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      @for (p of plans.hasValue() ? plans.value() : []; track p.id) {
        <article class="lv-card">
          <div class="mb-2 flex items-center justify-between gap-2">
            <h2 class="text-xl">{{ p.name }}</h2>
            @if (!p.isActive) {
              <lv-chip tone="bg-ink-900 text-white">Archivé</lv-chip>
            }
          </div>
          <p class="tabular text-2xl font-semibold text-teal-900">
            {{
              p.priceMonthlyXaf === null
                ? 'Tarif sur demande'
                : (p.priceMonthlyXaf | xaf) + ' / mois'
            }}
          </p>
          <dl class="lv-dl mt-3 text-sm">
            <dt>Code</dt>
            <dd>{{ p.code }}</dd>
            <dt>Annuel</dt>
            <dd>{{ p.priceYearlyXaf | xaf }}</dd>
            <dt>Utilisateurs inclus</dt>
            <dd>{{ p.includedUsers }}</dd>
            <dt>Utilisateur en plus</dt>
            <dd>{{ p.extraUserPriceXaf | xaf }}</dd>
            <dt>Essai</dt>
            <dd>{{ p.trialDays }} jours</dd>
          </dl>
          @if (admin) {
            <button type="button" class="lv-link-button mt-3" (click)="edit(p)">Modifier</button>
          }
        </article>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlansPage {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(Toast);
  protected readonly admin = inject(AuthService).hasPlatformRole('SUPER_ADMIN');
  protected readonly features = FEATURES;
  protected readonly plans = resource({ loader: () => this.api.plans() });
  protected readonly editing = signal(false);
  protected readonly editId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_]{2,30}$/)]],
    name: ['', Validators.required],
    priceMonthlyXaf: ['', Validators.pattern(/^\d*$/)],
    priceYearlyXaf: ['', Validators.pattern(/^\d*$/)],
    includedUsers: [2, [Validators.required, Validators.min(1)]],
    extraUserPriceXaf: ['', Validators.pattern(/^\d*$/)],
    trialDays: [14, [Validators.required, Validators.min(0)]],
    isActive: [true],
    features: this.fb.group({ stock: [true], accounting: [true], tours: [true], push: [true] }),
  });

  protected edit(p: PlanDto | null): void {
    this.editId.set(p?.id ?? null);
    this.error.set(null);
    this.form.reset();
    if (p) {
      // Un plan peut ne pas porter tous les drapeaux : absent = désactivé.
      const flags: Partial<Record<string, boolean>> = p.features;
      this.form.patchValue({
        code: p.code,
        name: p.name,
        priceMonthlyXaf: p.priceMonthlyXaf?.toString() ?? '',
        priceYearlyXaf: p.priceYearlyXaf?.toString() ?? '',
        includedUsers: p.includedUsers,
        extraUserPriceXaf: p.extraUserPriceXaf?.toString() ?? '',
        trialDays: p.trialDays,
        isActive: p.isActive,
        features: {
          stock: flags['stock'] ?? false,
          accounting: flags['accounting'] ?? false,
          tours: flags['tours'] ?? false,
          push: flags['push'] ?? false,
        },
      });
    }
    this.editing.set(true);
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = {
      code: v.code.toUpperCase(),
      name: v.name,
      priceMonthlyXaf: amount(v.priceMonthlyXaf),
      priceYearlyXaf: amount(v.priceYearlyXaf),
      includedUsers: v.includedUsers,
      extraUserPriceXaf: amount(v.extraUserPriceXaf),
      trialDays: v.trialDays,
      isActive: v.isActive,
      features: v.features,
    };
    try {
      const id = this.editId();
      if (id) {
        const { code: _code, ...changes } = body;
        await this.api.updatePlan(id, changes);
      } else {
        await this.api.createPlan(body);
      }
      this.editing.set(false);
      this.toast.success('Plan enregistré.');
      this.plans.reload();
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }
}
