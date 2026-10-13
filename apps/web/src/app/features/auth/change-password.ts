import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { PASSWORD_POLICY } from '@lavio/shared';
import { AuthService } from '../../core/auth/auth.service';
import { homeFor } from '../../core/auth/guards';
import { errorMessage, Toast } from '../../shared/ui/toast/toast.service';
import { AUTH_FIELD_OPTIONS, AuthLayout } from './auth-layout';
import { matchValidator } from './invitation';
import { PasswordField } from './password-field';

/** Changement de mot de passe (obligatoire après le mot de passe initial). */
@Component({
  selector: 'lv-change-password',
  imports: [ReactiveFormsModule, MatButtonModule, AuthLayout, PasswordField],
  template: `
    <lv-auth-layout
      heading="Changer de mot de passe"
      [subtitle]="
        required()
          ? 'Pour votre sécurité, choisissez un nouveau mot de passe avant de continuer.'
          : undefined
      "
    >
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <lv-password-field [control]="form.controls.current" label="Mot de passe actuel" />
        <lv-password-field
          [control]="form.controls.password"
          label="Nouveau mot de passe"
          autocomplete="new-password"
          hint="10 caractères au minimum."
        />
        <lv-password-field
          [control]="form.controls.confirm"
          label="Confirmez le nouveau mot de passe"
          autocomplete="new-password"
        />
        @if (error()) {
          <p class="lv-alert mb-4" role="alert">{{ error() }}</p>
        }
        <button mat-flat-button class="lv-auth-submit w-full" type="submit" [disabled]="pending()">
          {{ pending() ? 'Enregistrement…' : 'Enregistrer le mot de passe' }}
        </button>
        @if (!required()) {
          <button mat-button class="mt-2 w-full" type="button" (click)="back()">Annuler</button>
        }
      </form>
    </lv-auth-layout>
  `,
  providers: [AUTH_FIELD_OPTIONS],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePassword {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(Toast);
  protected readonly required = computed(() => this.auth.user()?.mustChangePassword ?? false);
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      current: ['', Validators.required],
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

  protected back(): void {
    void this.router.navigateByUrl(homeFor(this.auth));
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    try {
      const { current, password } = this.form.getRawValue();
      await this.auth.changePassword({ currentPassword: current, newPassword: password });
      this.toast.success('Votre mot de passe est enregistré.');
      await this.router.navigateByUrl(homeFor(this.auth));
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.pending.set(false);
    }
  }
}
