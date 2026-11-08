import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { type FormControl, ReactiveFormsModule } from '@angular/forms';
import { LV_FIELD } from '../../shared/ui/field/field';

/** Champ mot de passe avec bouton « Afficher ». */
@Component({
  selector: 'lv-password-field',
  imports: [ReactiveFormsModule, LV_FIELD],
  template: `
    <lv-field [label]="label()" [hint]="hint()" [errors]="errors">
      <div class="relative">
        <input
          lvControl
          class="pr-24"
          [type]="shown() ? 'text' : 'password'"
          [formControl]="control()"
          [attr.autocomplete]="autocomplete()"
          autocapitalize="none"
          spellcheck="false"
        />
        <button
          type="button"
          class="lv-ghost absolute top-1/2 right-1 min-h-9 -translate-y-1/2 px-3 text-sm"
          [attr.aria-pressed]="shown()"
          (click)="shown.set(!shown())"
        >
          {{ shown() ? 'Masquer' : 'Afficher' }}
        </button>
      </div>
    </lv-field>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordField {
  readonly control = input.required<FormControl<string>>();
  readonly label = input('Mot de passe');
  readonly autocomplete = input('current-password');
  readonly hint = input<string>();
  protected readonly shown = signal(false);
  protected readonly errors = {
    required: 'Ce champ est obligatoire.',
    minlength: '10 caractères au minimum.',
    mismatch: 'Les deux mots de passe ne correspondent pas.',
  };
}
