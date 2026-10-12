import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { type FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/** Champ mot de passe avec bouton « Afficher ». */
@Component({
  selector: 'lv-password-field',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  template: `
    <mat-form-field class="w-full">
      <mat-label>{{ label() }}</mat-label>
      <input
        matInput
        [type]="shown() ? 'text' : 'password'"
        [formControl]="control()"
        [attr.autocomplete]="autocomplete()"
      />
      <button
        matSuffix
        type="button"
        class="lv-link-button mr-2"
        [attr.aria-pressed]="shown()"
        (click)="shown.set(!shown())"
      >
        {{ shown() ? 'Masquer' : 'Afficher' }}
      </button>
      @if (hint()) {
        <mat-hint>{{ hint() }}</mat-hint>
      }
      @if (control().hasError('required')) {
        <mat-error>Ce champ est obligatoire.</mat-error>
      } @else if (control().hasError('minlength')) {
        <mat-error>10 caractères au minimum.</mat-error>
      } @else if (control().hasError('mismatch')) {
        <mat-error>Les deux mots de passe ne correspondent pas.</mat-error>
      }
    </mat-form-field>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordField {
  readonly control = input.required<FormControl<string>>();
  readonly label = input('Mot de passe');
  readonly autocomplete = input('current-password');
  readonly hint = input<string>();
  protected readonly shown = signal(false);
}
