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
import { AUTH_FIELD_OPTIONS, AuthLayout } from './auth-layout';
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

        @if (area() === 'app') {
          <p class="forgot">Mot de passe oublié ? Demandez un nouveau lien à votre responsable.</p>
        }
        @if (error()) {
          <p class="lv-alert mb-4" role="alert">{{ error() }}</p>
        }
        <button mat-flat-button class="lv-auth-submit w-full" type="submit" [disabled]="pending()">
          {{ pending() ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>
      @if (area() === 'app' && demoAccounts().length) {
        <section class="demo" aria-labelledby="demo-title">
          <h2 id="demo-title" class="divider"><span>ou essayez la démo</span></h2>
          <div class="demo-actions">
            @for (a of demoAccounts(); track a.email) {
              <button type="button" class="demo-chip" (click)="useDemo(a)">
                <span class="demo-initial" aria-hidden="true">{{ a.label.charAt(0) }}</span>
                {{ a.label }}
              </button>
            }
          </div>
          <p class="demo-hint">
            Pressing fictif en accès libre : les identifiants se remplissent seuls.
          </p>
        </section>
      }
      @if (area() === 'app') {
        <p class="foot">
          Pas encore client ? <a routerLink="/" fragment="contact">Être recontacté</a>
        </p>
      } @else {
        <p class="foot"><a routerLink="/">Retour à l’accueil</a></p>
      }
    </lv-auth-layout>
  `,
  styles: `
    .forgot {
      margin: -4px 0 18px;
      text-align: right;
      font-size: 13px;
      color: var(--lv-teal-700);
    }
    .demo {
      margin-top: 28px;
    }
    .divider {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 16px;
      font: 500 15px/1 var(--lv-font-body);
      color: var(--lv-teal-900);
    }
    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: color-mix(in srgb, var(--lv-teal-900) 15%, transparent);
    }
    .demo-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
    }
    .demo-chip {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      padding: 0 18px 0 6px;
      border: 1px solid color-mix(in srgb, var(--lv-teal-900) 18%, transparent);
      border-radius: 999px;
      background: var(--lv-white);
      color: var(--lv-teal-900);
      font: 600 15px/1 var(--lv-font-body);
      cursor: pointer;
      box-shadow: var(--lv-shadow-card);
      transition:
        transform var(--lv-duration) var(--lv-ease),
        border-color var(--lv-duration) var(--lv-ease);
    }
    .demo-chip:hover {
      transform: translateY(-2px);
      border-color: var(--lv-teal-900);
    }
    .demo-initial {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--lv-mint-100);
    }
    .demo-hint {
      margin: 12px 0 0;
      text-align: center;
      font-size: 13px;
      color: color-mix(in srgb, var(--lv-ink-900) 75%, transparent);
    }
    .foot {
      margin: 32px 0 0;
      text-align: center;
      font-size: 14px;
    }
    .foot a {
      font-weight: 700;
    }
    @media (prefers-reduced-motion: reduce) {
      .demo-chip {
        transition: none;
      }
    }
  `,
  providers: [AUTH_FIELD_OPTIONS],
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
