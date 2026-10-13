import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import {
  type AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { PASSWORD_POLICY } from '@lavio/shared';
import { AuthService } from '../../core/auth/auth.service';
import { homeFor } from '../../core/auth/guards';
import { errorMessage } from '../../shared/ui/toast/toast.service';
import { AUTH_FIELD_OPTIONS, AuthLayout } from './auth-layout';
import { PasswordField } from './password-field';

export function matchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password');
  const confirm = group.get('confirm');
  if (!password || !confirm) return null;
  if (confirm.value && password.value !== confirm.value) {
    confirm.setErrors({ ...(confirm.errors ?? {}), mismatch: true });
  } else if (confirm.hasError('mismatch')) {
    const { mismatch: _mismatch, ...rest } = confirm.errors ?? {};
    confirm.setErrors(Object.keys(rest).length ? rest : null);
  }
  return null;
}

/** Lien d'invitation ou de réinitialisation : choix du mot de passe (`/invitation?token=…`). */
@Component({
  selector: 'lv-invitation',
  imports: [ReactiveFormsModule, MatButtonModule, AuthLayout, PasswordField],
  template: `
    <lv-auth-layout
      heading="Choisissez votre mot de passe"
      subtitle="Il vous servira à vous connecter à Lavio."
    >
      @if (!token()) {
        <p class="lv-alert" role="alert">
          Ce lien est incomplet. Demandez un nouveau lien d’invitation.
        </p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <lv-password-field
            [control]="form.controls.password"
            label="Nouveau mot de passe"
            autocomplete="new-password"
            hint="10 caractères au minimum."
          />
          <lv-password-field
            [control]="form.controls.confirm"
            label="Confirmez le mot de passe"
            autocomplete="new-password"
          />
          @if (error()) {
            <p class="lv-alert mb-4" role="alert">{{ error() }}</p>
          }
          <button
            mat-flat-button
            class="lv-auth-submit w-full"
            type="submit"
            [disabled]="pending()"
          >
            {{ pending() ? 'Enregistrement…' : 'Enregistrer et me connecter' }}
          </button>
        </form>
      }
    </lv-auth-layout>
  `,
  providers: [AUTH_FIELD_OPTIONS],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Invitation {
  readonly token = input<string>();
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(PASSWORD_POLICY.minLength),
          Validators.maxLength(PASSWORD_POLICY.maxLength),
        ],
      ],
      confirm: ['', Validators.required],
    },
    { validators: matchValidator },
  );

  protected async submit(): Promise<void> {
    const token = this.token();
    if (this.form.invalid || !token) {
      this.form.markAllAsTouched();
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    try {
      await this.auth.acceptInvitation({ token, password: this.form.getRawValue().password });
      await this.router.navigateByUrl(homeFor(this.auth));
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.pending.set(false);
    }
  }
}
