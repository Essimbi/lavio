import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import type { LoginArea, PublicDemoAccount } from '@lavio/shared';
import { PublicApi } from '../../core/api/public-api';
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
      @if (area() === 'app' && demoAccounts().length) {
        <section class="demo-box mt-6" aria-labelledby="demo-box-title">
          <h2 id="demo-box-title">Démonstration</h2>
          <p>Pressing fictif en accès libre. Choisissez un compte :</p>
          <div class="demo-box-actions">
            @for (a of demoAccounts(); track a.email) {
              <button type="button" mat-stroked-button (click)="useDemo(a)">
                {{ a.label }}
              </button>
            }
          </div>
        </section>
      }
      @if (area() === 'app') {
        <p class="mt-6 text-sm">
          Mot de passe oublié ? Demandez un nouveau lien à votre responsable.
        </p>
        <a routerLink="/" class="mt-2 inline-block text-sm">Retour à l’accueil</a>
      }
    </lv-auth-layout>
  `,
  styles: `
    .demo-box {
      padding: 16px;
      border-radius: var(--lv-radius-card);
      background: var(--lv-mint-100);
    }
    .demo-box h2 {
      margin: 0 0 4px;
      font-size: 16px;
    }
    .demo-box p {
      margin: 0 0 12px;
      font-size: 14px;
    }
    .demo-box-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  /** Espace (données de route). */
  readonly area = input<LoginArea>('app');
  /** Page demandée avant la connexion (paramètre `?retour=`). */
  readonly retour = input<string>();
  /** Compte de démonstration à pré-remplir (paramètre `?demo=`, index dans la configuration publique). */
  readonly demo = input<string>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    identifier: ['', Validators.required],
    password: ['', Validators.required],
  });
  /** Comptes de démonstration publiés par l'API (vide si la démonstration est fermée). */
  protected readonly demoAccounts = signal<PublicDemoAccount[]>([]);

  constructor() {
    const api = inject(PublicApi);
    afterNextRender(() => {
      if (this.area() !== 'app') return;
      api.config().then(
        (c) => {
          const accounts = c.demo?.accounts ?? [];
          this.demoAccounts.set(accounts);
          const chosen = accounts.at(Number(this.demo() ?? NaN));
          if (chosen) this.useDemo(chosen);
        },
        () => this.demoAccounts.set([]),
      );
    });
  }

  protected useDemo(account: PublicDemoAccount): void {
    this.form.setValue({ identifier: account.email, password: account.password });
    this.error.set(null);
  }

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
