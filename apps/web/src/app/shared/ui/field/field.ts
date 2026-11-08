import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  Directive,
  type DoCheck,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { NgControl } from '@angular/forms';

let nextId = 0;

/**
 * Champ de formulaire Lavio : libellé au-dessus, aide et message d'erreur reliés au contrôle.
 * Le contrôle natif (`input`, `select`, `textarea`) porte la directive `lvControl`.
 *
 * ```html
 * <lv-field label="Nom" hint="Tel qu'il apparaît sur le ticket." [errors]="{ required: 'Indiquez le nom.' }">
 *   <input lvControl formControlName="name" />
 * </lv-field>
 * ```
 */
@Component({
  selector: 'lv-field',
  template: `
    <label class="lv-label" [attr.for]="id">
      {{ label() }}
      @if (optional()) {
        <span class="lv-optional">facultatif</span>
      }
    </label>
    <ng-content />
    @if (message(); as m) {
      <p class="lv-error" [id]="errorId" role="alert">{{ m }}</p>
    } @else if (hint()) {
      <p class="lv-hint" [id]="hintId">{{ hint() }}</p>
    }
  `,
  host: { class: 'lv-field', '[class.lv-field-invalid]': 'showError()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LvField {
  readonly label = input.required<string>();
  readonly hint = input<string>();
  readonly optional = input(false);
  /** Messages par clé d'erreur du contrôle (`required`, `pattern`, `min`…) ; le premier présent s'affiche. */
  readonly errors = input<Record<string, string>>({});
  /** Message imposé par l'écran (erreur serveur, règle croisée), prioritaire sur `errors`. */
  readonly error = input<string | null>(null);

  readonly id = `lv-field-${++nextId}`;
  readonly hintId = `${this.id}-hint`;
  readonly errorId = `${this.id}-error`;

  /** État publié par `lvControl` : erreurs courantes et contrôle déjà touché ou soumis. */
  readonly controlErrors = signal<Record<string, unknown> | null>(null);
  readonly interacted = signal(false);

  readonly showError = computed(
    () => !!this.error() || (this.interacted() && this.controlErrors() !== null),
  );
  protected readonly message = computed(() => {
    const forced = this.error();
    if (forced) return forced;
    const errs = this.controlErrors();
    if (!this.interacted() || !errs) return null;
    const known = this.errors();
    const key = Object.keys(errs).find((k) => known[k]);
    return key ? (known[key] ?? null) : 'Valeur invalide.';
  });
  /** `aria-describedby` du contrôle : message d'erreur s'il est affiché, sinon l'aide. */
  readonly describedBy = computed(() =>
    this.showError() ? this.errorId : this.hint() ? this.hintId : null,
  );
}

/**
 * Contrôle natif d'un `lv-field` : identifiant, style (`lv-input` ou `lv-select`), `aria-invalid`
 * et `aria-describedby`. Fonctionne aussi hors de `lv-field` (style seul).
 */
@Directive({
  selector: 'input[lvControl], select[lvControl], textarea[lvControl]',
  host: {
    '[id]': 'field?.id ?? null',
    '[class.lv-input]': '!isSelect',
    '[class.lv-select]': 'isSelect',
    '[attr.aria-invalid]': 'field?.showError() ? "true" : null',
    '[attr.aria-describedby]': 'field?.describedBy() ?? null',
  },
})
export class LvControl implements DoCheck {
  protected readonly field = inject(LvField, { optional: true });
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly destroyRef = inject(DestroyRef);
  protected readonly isSelect =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'SELECT';
  private subscribed = false;

  /**
   * Synchronisation à chaque vérification (saisie, sortie du champ, soumission) et sur les
   * événements du contrôle (changements faits par le code, hors détection).
   */
  ngDoCheck(): void {
    const control = this.ngControl?.control;
    if (!control || !this.field) return;
    if (!this.subscribed) {
      this.subscribed = true;
      const sub = control.events.subscribe(() => this.sync());
      this.destroyRef.onDestroy(() => sub.unsubscribe());
    }
    this.sync();
  }

  private sync(): void {
    const control = this.ngControl?.control;
    if (!control || !this.field) return;
    this.field.controlErrors.set(control.errors);
    this.field.interacted.set(control.touched || control.dirty);
  }
}

/** Les deux pièces d'un champ, à importer ensemble. */
export const LV_FIELD = [LvField, LvControl] as const;
