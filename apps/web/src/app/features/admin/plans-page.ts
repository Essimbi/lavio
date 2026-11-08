import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PLAN_HIGHLIGHTS, type PlanDto } from '@lavio/shared';
import { AdminApi } from '../../core/api/admin-api';
import { AuthService } from '../../core/auth/auth.service';
import { XafPipe } from '../../shared/format/format';
import { LV_FIELD } from '../../shared/ui/field/field';
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

/**
 * Plans d'abonnement : prix lus ici, jamais écrits en dur (docs/06, docs/14). Seuls les plans
 * publics, avec leur accroche et leurs avantages, sont présentés sur la landing.
 */
@Component({
  selector: 'lv-plans-page',
  imports: [ReactiveFormsModule, LV_FIELD, PageHeader, Chip, XafPipe],
  template: `
    <lv-page-header
      heading="Plans"
      subtitle="Offres d’abonnement. Seuls les plans publics sont présentés sur la landing."
    >
      @if (admin && !editing()) {
        <button class="lv-primary" type="button" (click)="edit(null)">Nouveau plan</button>
      }
    </lv-page-header>

    @if (editing()) {
      <form class="lv-card mb-6 grid gap-6" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <h2 class="text-xl">{{ editId() ? 'Modifier le plan' : 'Nouveau plan' }}</h2>

        <section class="grid gap-4" aria-labelledby="plan-terms">
          <h3 id="plan-terms" class="text-base">Conditions</h3>
          <div class="lv-form-grid">
            <lv-field
              label="Code"
              hint="Ex. STANDARD : lettres, chiffres et « _ »."
              [errors]="{
                required: 'Indiquez un code.',
                pattern: 'Lettres, chiffres et « _ » (2 à 30).',
              }"
            >
              <input
                lvControl
                formControlName="code"
                [readonly]="!!editId()"
                autocapitalize="characters"
              />
            </lv-field>
            <lv-field label="Nom" [errors]="{ required: 'Indiquez le nom du plan.' }">
              <input lvControl formControlName="name" />
            </lv-field>
            <lv-field
              label="Prix mensuel (FCFA)"
              hint="Vide : « Tarif sur demande »."
              [optional]="true"
              [errors]="{ pattern: 'Montant entier en FCFA.' }"
            >
              <input lvControl formControlName="priceMonthlyXaf" inputmode="numeric" />
            </lv-field>
            <lv-field
              label="Prix annuel (FCFA)"
              [optional]="true"
              [errors]="{ pattern: 'Montant entier en FCFA.' }"
            >
              <input lvControl formControlName="priceYearlyXaf" inputmode="numeric" />
            </lv-field>
            <lv-field
              label="Utilisateurs inclus"
              [errors]="{ required: 'Au moins 1.', min: 'Au moins 1.' }"
            >
              <input lvControl type="number" min="1" formControlName="includedUsers" />
            </lv-field>
            <lv-field
              label="Utilisateur supplémentaire (FCFA / mois)"
              [optional]="true"
              [errors]="{ pattern: 'Montant entier en FCFA.' }"
            >
              <input lvControl formControlName="extraUserPriceXaf" inputmode="numeric" />
            </lv-field>
            <lv-field
              label="Durée d’essai (jours)"
              [errors]="{ required: 'Indiquez une durée.', min: '0 ou plus.' }"
            >
              <input lvControl type="number" min="0" formControlName="trialDays" />
            </lv-field>
          </div>
          <fieldset class="grid gap-1">
            <legend class="lv-label">Fonctionnalités incluses</legend>
            <div class="flex flex-wrap gap-x-6" formGroupName="features">
              @for (f of features; track f.key) {
                <label class="lv-check"
                  ><input type="checkbox" [formControlName]="f.key" />{{ f.label }}</label
                >
              }
            </div>
          </fieldset>
        </section>

        <section class="grid gap-4 border-t border-mint-100 pt-5" aria-labelledby="plan-public">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 id="plan-public" class="text-base">Présentation sur la landing</h3>
              <p class="lv-hint">
                Un plan négocié pour un seul client reste privé : il n’apparaît pas sur le site.
              </p>
            </div>
            <label class="lv-check">
              <input type="checkbox" role="switch" class="lv-switch" formControlName="isPublic" />
              Présenté sur la landing
            </label>
          </div>
          <lv-field
            label="Accroche"
            hint="Une phrase sous le nom du plan."
            [optional]="true"
            [errors]="{ maxlength: descriptionMax + ' caractères au plus.' }"
          >
            <input lvControl formControlName="description" [maxlength]="descriptionMax" />
          </lv-field>
          <lv-field
            label="Avantages"
            [hint]="
              'Un avantage par ligne, ' +
              highlightsMax +
              ' au plus, ' +
              highlightMaxLength +
              ' caractères chacun.'
            "
            [optional]="true"
            [error]="highlightsError()"
          >
            <textarea lvControl rows="5" formControlName="highlights"></textarea>
          </lv-field>
        </section>

        <label class="lv-check">
          <input type="checkbox" role="switch" class="lv-switch" formControlName="isActive" />
          Plan proposé aux nouveaux pressings
        </label>

        @if (error()) {
          <p class="lv-alert" role="alert">{{ error() }}</p>
        }
        <div class="flex flex-wrap gap-2">
          <button class="lv-primary" type="submit">Enregistrer le plan</button>
          <button class="lv-ghost" type="button" (click)="editing.set(false)">Annuler</button>
        </div>
      </form>
    }

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      @for (p of plans.hasValue() ? plans.value() : []; track p.id) {
        <article class="lv-card flex flex-col">
          <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-xl">{{ p.name }}</h2>
            <div class="flex gap-1">
              @if (p.isPublic) {
                <lv-chip tone="bg-aqua-400 text-ink-900">Public</lv-chip>
              } @else {
                <lv-chip tone="bg-mint-100 text-teal-900">Privé</lv-chip>
              }
              @if (!p.isActive) {
                <lv-chip tone="bg-ink-900 text-white">Archivé</lv-chip>
              }
            </div>
          </div>
          @if (p.description) {
            <p class="mb-2 text-sm">{{ p.description }}</p>
          }
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
            <dd>{{ p.priceYearlyXaf === null ? '—' : (p.priceYearlyXaf | xaf) }}</dd>
            <dt>Utilisateurs inclus</dt>
            <dd>{{ p.includedUsers }}</dd>
            <dt>Utilisateur en plus</dt>
            <dd>{{ p.extraUserPriceXaf === null ? '—' : (p.extraUserPriceXaf | xaf) }}</dd>
            <dt>Essai</dt>
            <dd>{{ p.trialDays }} jours</dd>
          </dl>
          @if (p.highlights.length) {
            <ul class="mt-3 grid gap-1 text-sm" role="list">
              @for (h of p.highlights; track $index) {
                <li class="flex gap-2">
                  <span class="text-teal-700" aria-hidden="true">✓</span>{{ h }}
                </li>
              }
            </ul>
          }
          @if (admin) {
            <button type="button" class="lv-secondary mt-4 self-start" (click)="edit(p)">
              Modifier
            </button>
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
  protected readonly highlightsMax = PLAN_HIGHLIGHTS.max;
  protected readonly highlightMaxLength = PLAN_HIGHLIGHTS.maxLength;
  protected readonly descriptionMax = PLAN_HIGHLIGHTS.descriptionMaxLength;
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
    isPublic: [false],
    description: ['', Validators.maxLength(PLAN_HIGHLIGHTS.descriptionMaxLength)],
    highlights: [''],
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
        isPublic: p.isPublic,
        description: p.description ?? '',
        highlights: p.highlights.join('\n'),
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

  /** Avantages saisis, un par ligne, sans lignes vides. */
  private highlightLines(): string[] {
    return this.form.controls.highlights.value
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l !== '');
  }

  protected highlightsError(): string | null {
    const lines = this.highlightLines();
    if (lines.length > PLAN_HIGHLIGHTS.max) return `${PLAN_HIGHLIGHTS.max} avantages au plus.`;
    if (lines.some((l) => l.length > PLAN_HIGHLIGHTS.maxLength))
      return `${PLAN_HIGHLIGHTS.maxLength} caractères au plus par avantage.`;
    return null;
  }

  protected async save(): Promise<void> {
    if (this.form.invalid || this.highlightsError()) {
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
      isPublic: v.isPublic,
      description: v.description.trim() || null,
      highlights: this.highlightLines(),
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
