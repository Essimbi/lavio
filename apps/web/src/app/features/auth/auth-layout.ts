import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Logo } from '../../shared/ui/logo/logo';

/** Mise en page des écrans de connexion : carte centrée sur fond écume. */
@Component({
  selector: 'lv-auth-layout',
  imports: [Logo],
  template: `
    <main class="auth">
      <div class="auth-card">
        <lv-logo [width]="132" />
        <h1 class="mt-6 text-[28px]">{{ heading() }}</h1>
        @if (subtitle()) {
          <p class="mt-1 text-ink-900/80">{{ subtitle() }}</p>
        }
        <div class="mt-6"><ng-content /></div>
      </div>
    </main>
  `,
  styles: `
    .auth {
      display: grid;
      place-items: center;
      min-height: 100dvh;
      padding: 24px 16px;
      background:
        radial-gradient(50rem 26rem at 100% 0%, var(--lv-mint-100), transparent 70%),
        var(--lv-foam-50);
    }
    .auth-card {
      width: min(420px, 100%);
      padding: 32px 28px;
      border-radius: var(--lv-radius-block);
      background: var(--lv-white);
      box-shadow: var(--lv-shadow-card);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {
  readonly heading = input.required<string>();
  readonly subtitle = input<string>();
}
