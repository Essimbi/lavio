import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import type { LoginArea } from '@lavio/shared';
import { AuthService } from '../../core/auth/auth.service';
import { homeFor } from '../../core/auth/guards';
import { errorMessage } from '../../shared/ui/toast/toast.service';
import { AuthLayout } from './auth-layout';
import { PasswordField } from './password-field';

/** Connexion (docs/02) : e-mail ou téléphone + mot de passe. `/login` et `/admin/login`. */
@Component({
  selector: 'lv-login',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    RouterLink,
    AuthLayout,
    PasswordField,
  ],
  template: `
    <lv-auth-layout
      [heading]="area() === 'admin' ? 'Superadmin' : 'Connexion'"
      [subtitle]="
        area() === 'admin'
          ? 'Espace de gestion de la plateforme Lavio.'
          : 'Accédez à votre pressing.'
      "
    >
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <mat-form-field class="w-full">
          <mat-label>E-mail ou téléphone</mat-label>
          <input matInput formControlName="identifier" autocomplete="username" inputmode="email" />
          @if (form.controls.identifier.hasError('required')) {
            <mat-error>Indiquez votre e-mail ou votre numéro de téléphone.</mat-error>
          }
        </mat-form-field>
        <lv-password-field [control]="form.controls.password" />

        @if (error()) {
          <p class="lv-alert mb-4" role="alert">{{ error() }}</p>
        }
        <button mat-flat-button class="w-full" type="submit" [disabled]="pending()">
          {{ pending() ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>
      @if (area() === 'app') {
        <p class="mt-6 text-sm">
          Mot de passe oublié ? Demandez un nouveau lien à votre responsable.
        </p>
        <a routerLink="/" class="mt-2 inline-block text-sm">Retour à l’accueil</a>
      }
    </lv-auth-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  /** Espace (données de route). */
  readonly area = input<LoginArea>('app');
  /** Page demandée avant la connexion (paramètre `?retour=`). */
  readonly retour = input<string>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    identifier: ['', Validators.required],
    password: ['', Validators.required],
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    try {
      const { identifier, password } = this.form.getRawValue();
      await this.auth.login(identifier, password, this.area());
      const home = homeFor(this.auth);
      const retour = this.retour();
      const safe = retour?.startsWith(this.area() === 'admin' ? '/admin' : '/app') ? retour : null;
      await this.router.navigateByUrl(home.endsWith('/password') ? home : (safe ?? home));
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.pending.set(false);
    }
  }
}
