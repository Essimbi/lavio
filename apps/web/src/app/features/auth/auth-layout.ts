import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { RouterLink } from '@angular/router';
import { Logo } from '../../shared/ui/logo/logo';

/** Champs encadrés sur les écrans de connexion (à fournir par chaque écran). */
export const AUTH_FIELD_OPTIONS = {
  provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
  useValue: { appearance: 'outline' },
};

/**
 * Mise en page des écrans de connexion : formulaire à gauche, grand disque de marque à droite
 * (masqué sur téléphone), bulles décoratives en fond.
 */
@Component({
  selector: 'lv-auth-layout',
  imports: [Logo, RouterLink],
  template: `
    <div class="auth">
      <div class="bubbles" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>

      <main class="form-side">
        <div class="form-col">
          <a routerLink="/" class="mark" aria-label="Lavio, accueil">
            <lv-logo [width]="112" />
          </a>
          <h1>{{ heading() }}</h1>
          @if (subtitle()) {
            <p class="subtitle">{{ subtitle() }}</p>
          }
          <div class="content"><ng-content /></div>
        </div>
      </main>

      <aside class="brand-side" aria-label="Lavio">
        <div class="disc">
          <div class="disc-copy">
            <p class="disc-title">Lavio</p>
            <p class="disc-text">
              Dépôts, suivi des vêtements, caisse, stock et comptabilité de gestion : votre
              pressing, sous contrôle, du comptoir à votre téléphone.
            </p>
            <div class="disc-actions">
              <a routerLink="/" class="disc-btn">Découvrir Lavio</a>
              <a
                routerLink="/"
                fragment="apercu"
                class="disc-play"
                aria-label="Voir l’aperçu de l’application"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M8 5v14l11-7z" fill="currentColor" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </aside>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .auth {
      position: relative;
      display: grid;
      min-height: 100dvh;
      overflow: hidden;
      background:
        radial-gradient(40rem 30rem at 0% 100%, var(--lv-mint-100), transparent 70%),
        radial-gradient(
          30rem 20rem at 30% 0%,
          color-mix(in srgb, var(--lv-aqua-400) 14%, transparent),
          transparent 70%
        ),
        var(--lv-foam-50);
    }
    @media (min-width: 1024px) {
      .auth {
        grid-template-columns: minmax(28rem, 1fr) 1.15fr;
      }
    }

    /* Bulles décoratives */
    .bubbles {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .bubbles i {
      position: absolute;
      border: 2px solid color-mix(in srgb, var(--lv-aqua-400) 35%, transparent);
      border-radius: 50%;
      animation: drift 9s ease-in-out infinite;
    }
    .bubbles i:nth-child(1) {
      top: 6%;
      left: 8%;
      width: 22px;
      height: 22px;
    }
    .bubbles i:nth-child(2) {
      top: 18%;
      left: 38%;
      width: 34px;
      height: 34px;
      animation-delay: -2s;
    }
    .bubbles i:nth-child(3) {
      bottom: 12%;
      left: 6%;
      width: 28px;
      height: 28px;
      animation-delay: -4s;
    }
    .bubbles i:nth-child(4) {
      bottom: 6%;
      left: 42%;
      width: 40px;
      height: 40px;
      animation-delay: -6s;
    }
    .bubbles i:nth-child(5) {
      top: 52%;
      left: 2%;
      width: 14px;
      height: 14px;
      animation-delay: -3s;
    }
    .bubbles i:nth-child(6) {
      top: 70%;
      left: 46%;
      width: 12px;
      height: 12px;
      animation-delay: -5s;
    }
    @keyframes drift {
      50% {
        transform: translateY(-10px);
      }
    }

    /* Formulaire */
    .form-side {
      position: relative;
      z-index: 1;
      display: grid;
      place-items: center;
      padding: 40px 20px;
    }
    .form-col {
      width: min(400px, 100%);
      animation: enter 0.5s var(--lv-ease) both;
    }
    @keyframes enter {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
    }
    .mark {
      display: flex;
      justify-content: center;
      width: fit-content;
      margin: 0 auto 20px;
      padding: 14px 22px;
      border: 3px solid transparent;
      border-radius: var(--lv-radius-pill);
      background:
        linear-gradient(var(--lv-white), var(--lv-white)) padding-box,
        linear-gradient(140deg, var(--lv-aqua-400), var(--lv-teal-900)) border-box;
      box-shadow: 0 12px 30px -14px color-mix(in srgb, var(--lv-teal-900) 50%, transparent);
    }
    h1 {
      margin: 0;
      text-align: center;
      font-size: clamp(24px, 3vw, 30px);
      color: var(--lv-teal-700);
    }
    .subtitle {
      margin: 6px 0 0;
      text-align: center;
      color: color-mix(in srgb, var(--lv-ink-900) 80%, transparent);
    }
    .content {
      margin-top: 28px;
    }

    /* Grand disque de marque */
    .brand-side {
      display: none;
    }
    @media (min-width: 1024px) {
      .brand-side {
        position: relative;
        display: grid;
        align-items: center;
      }
    }
    .disc {
      position: relative;
      width: 125%;
      aspect-ratio: 1;
      margin-left: 4%;
      border-radius: 50%;
      background:
        radial-gradient(
          28rem 20rem at 25% 20%,
          color-mix(in srgb, var(--lv-white) 18%, transparent),
          transparent 70%
        ),
        radial-gradient(
          30rem 24rem at 80% 90%,
          color-mix(in srgb, var(--lv-aqua-400) 55%, transparent),
          transparent 70%
        ),
        linear-gradient(150deg, var(--lv-teal-700), var(--lv-teal-900) 70%);
      box-shadow:
        0 0 0 14px color-mix(in srgb, var(--lv-aqua-400) 18%, transparent),
        0 0 80px 20px color-mix(in srgb, var(--lv-aqua-400) 25%, transparent);
      animation: grow 0.7s var(--lv-ease) both;
    }
    @keyframes grow {
      from {
        opacity: 0;
        transform: translateX(40px) scale(0.96);
      }
    }
    .disc-copy {
      position: absolute;
      top: 50%;
      left: 13%;
      width: min(26rem, 36%);
      translate: 0 -50%;
      color: var(--lv-white);
    }
    .disc-title {
      margin: 0 0 14px;
      font: 700 clamp(48px, 5.4vw, 76px) / 1 var(--lv-font-display);
      letter-spacing: 0.01em;
    }
    .disc-text {
      margin: 0 0 28px;
      font-size: 16px;
      color: color-mix(in srgb, var(--lv-white) 90%, transparent);
    }
    .disc-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .disc-btn {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 0 22px;
      border-radius: var(--lv-radius-pill);
      background: var(--lv-white);
      color: var(--lv-teal-900);
      font-weight: 600;
      text-decoration: none;
      transition: transform var(--lv-duration) var(--lv-ease);
    }
    .disc-play {
      display: grid;
      place-items: center;
      width: 46px;
      height: 46px;
      border: 2px solid var(--lv-white);
      border-radius: 50%;
      color: var(--lv-white);
      transition:
        transform var(--lv-duration) var(--lv-ease),
        background-color var(--lv-duration) var(--lv-ease);
    }
    .disc-btn:hover,
    .disc-play:hover {
      transform: translateY(-2px);
    }
    .disc-play:hover {
      background: color-mix(in srgb, var(--lv-white) 16%, transparent);
    }
    .disc-btn:focus-visible,
    .disc-play:focus-visible {
      outline: 3px solid var(--lv-white);
      outline-offset: 3px;
    }

    @media (prefers-reduced-motion: reduce) {
      .bubbles i,
      .form-col,
      .disc {
        animation: none;
      }
      .disc-btn,
      .disc-play {
        transition: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {
  readonly heading = input.required<string>();
  readonly subtitle = input<string>();
}
